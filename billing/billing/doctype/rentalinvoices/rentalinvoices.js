// Copyright (c) 2025, Frugal Scientific and contributors
// For license information, please see license.txt

frappe.ui.form.on("RentalInvoices", {
    refresh: function (frm) {
        $('.form-sidebar').hide();
        $('.prev-doc').hide();
        $('.next-doc').hide();
        frm.disable_save();
        // set_fields_readonly_based_on_inv_date(frm);
        if (!frappe.user.has_role('Administrator')) {
            $("#navbar-breadcrumbs").css({ 'visibility': 'hidden' });

            // frm.disable_save();
            setTimeout(() => {

                frm.page.menu.find('.dropdown-item:contains("Jump to field")').hide();
                frm.page.menu.find('.dropdown-item:contains("Links")').hide();
                frm.page.menu.find('.dropdown-item:contains("Duplicate")').hide();
                frm.page.menu.find('.dropdown-item:contains("Remind Me")').hide();
                $('div.section-head:contains("Connections")').hide();

            }, 101);
        }
    },

    re_calculate_invoice: function (frm) {
        const invNumber = frm.doc.inv_number;
        const status = frm.doc.inv_status;

        function ReCalculate(invN){     // Call backend python to re-calculate
             frappe.call({
                method: "billing.billing.doctype.rentalinvoices.rentalinvoices.recalculate_invoice",
                args: {
                    invNumber: invN
                },
                callback: function (r) {
                    frappe.msgprint("Re calculated " + invN + '. You need to approve it to send to customer.');
                },
                error: function (err) {
                    frappe.msgprint({
                        title: "Recalculation Failed",
                        message: "Backend call failed.",
                        indicator: "red"
                    });
                }
            });
        }   // End of function

        if (! frm.is_dirty('discount')) {
            frappe.msgprint("Discount not changed. No re-calculation required.");
            return;
        }

        frm.save()          // Save the  form
            .then(() => {   // On successful save:
                 if (status.startsWith("Sent")){
                    let msg = frappe.msgprint({
                        title: 'Warning',
                        message: "This invoice is already sent to the customer.<br>Are you sure you want to re-open it?<br>After re-open, you need to approve",
                        primary_action_label: 'I Understand',
                        primary_action: {
                            action(values) {
                                   msg.hide();
                                   ReCalculate(invNumber);
                            }
                        }
                    });
                }
                else
                 ReCalculate(invNumber)
            })
            .catch(err => {
                frappe.msgprint(`Failed to save discount: ${err}`);
            });
    },

    approve_and_email_invoice: function (frm) {
        const invNumber = frm.doc.inv_number;
        let status = frm.doc.inv_status;
        if (status.startsWith("Sent")){
            frappe.msgprint({
                    title: "Already Sent",
                    message: "This invoice is already sent to customer.",
                    indicator: "red"
            });
            return
        }

        frappe.call({
            method: "billing.billing.doctype.rentalinvoices.rentalinvoices.approve_and_email_invoice",
            args: {
                invNumber: invNumber
            },
            callback: function (r) {
                frappe.msgprint({
                    title: "Approval Result",
                    message: JSON.stringify(r.message),
                    indicator: "green"
                });
            },
            error: function(err) {
                 frappe.msgprint("Backend error");
            }
        });
    },
    view_invoice: function (frm) {
       const invPath = frm.doc.pdfpath;
       const invNumber = frm.doc.inv_number;
       const pdfURL = "https://invoicessmarterhomes.s3.ap-south-1.amazonaws.com/"+ invPath
       const emburl = "https://docs.google.com/gview?url=" + pdfURL + "&embedded=true"
       const framehtml = `<iframe src="` + emburl + `" style="width:718px; height:700px;" frameborder="0"></iframe>"`
       const d = new frappe.ui.Dialog({
            title: invNumber,
            size: "large",
            primary_action_label: "Download",
            primary_action(values) {
                // force browser download
                const a = document.createElement("a");
                a.href = pdfURL;
                a.download = invNumber.replaceAll('/','-') + ".pdf"  // Name of target file
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
        });
        // Using google pdf viewer. This may not be maintained by google. Need an alternative
        d.$body.html(framehtml );
        d.show();
    },

    save_amt_rcvd: function(frm) {      // Save changes to amt_rcvd and tds, if any
        frm.save();
    },
    appreciation_list: function(frm){
	frappe.show_progress('Calculating', 0, 100, 'Please wait...');

	frappe.call({
            method: "billing.billing.doctype.rentalinvoices.rentalinvoices.appreciation_list",
            args: {
            },
            callback: function (r) {
		// r.message : CSV of the appreciation list
		// Provide the CSV as a file-download to the user
		const blob = new Blob([r.message.message], { type: 'text/plain' });
      		const url = URL.createObjectURL(blob); // Create a temporary URL
      		const a = document.createElement('a'); // Create a hidden anchor and trigger click
      		a.href = url;
		let todate = new Date()
      		a.download = "AppreciationList-"+ todate.toISOString().split('T')[0] + ".csv"
		document.body.appendChild(a); 
		a.click();

      		// Clean up
      		document.body.removeChild(a);
      		URL.revokeObjectURL(url);
		frappe.show_progress('Calculating', 100, 100, 'Done');
                frappe.hide_progress();
            },
        });

	
    },
});

function set_fields_readonly_based_on_inv_date(frm) {
    if (!frm.doc.inv_date) return;

    const invDate = frappe.datetime.str_to_obj(frm.doc.inv_date);
    const today = frappe.datetime.str_to_obj(frappe.datetime.get_today());

    const sameMonth = (invDate.getMonth() === today.getMonth()) &&
        (invDate.getFullYear() === today.getFullYear());

    const prevMonth = new Date(today);
    prevMonth.setMonth(today.getMonth() - 1);

    const previousMonth = (invDate.getMonth() === prevMonth.getMonth()) &&
        (invDate.getFullYear() === prevMonth.getFullYear());

    const editable = sameMonth || previousMonth;

    const fields = ['discount', 'amt_rcvd', 'tds'];

    fields.forEach(field => {
        frm.set_df_property(field, 'read_only', !editable);
    });

    frm.refresh_fields(fields);
}
