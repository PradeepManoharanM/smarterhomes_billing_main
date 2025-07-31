// Copyright (c) 2025, Frugal Scientific and contributors
// For license information, please see license.txt

frappe.ui.form.on("RentalInvoices", {
        refresh: function (frm) {
            $('.form-sidebar').hide();
            $('.prev-doc').hide();
            $('.next-doc').hide();
            // frm.disable_save();
            if (!frappe.user.has_role('Administrator')) {
                $("#navbar-breadcrumbs").css({ 'visibility': 'hidden' });
              
                // frm.disable_save();
                setTimeout(() => {
                        
                    frm.page.menu.find('.dropdown-item:contains("Jump to field")').hide();
                    frm.page.menu.find('.dropdown-item:contains("Links")').hide();
                    frm.page.menu.find('.dropdown-item:contains("Duplicate")').hide();
                    frm.page.menu.find('.dropdown-item:contains("Remind Me")').hide();
                    $('div.section-head:contains("Connections")').hide();

                }, 100);
            }
        },


    re_calculate_invoice: function(frm) {

        // frappe.call({
        //     method: "propman.propman.doctype.rentalinvoices.rentalinvoices.calculate_invoice",
        //     args: {

        //         "doc": frm.doc,
               
        //     },
        // })
        // handle_invoice_action(frm, "recalculate");

        (async () => {
                    const propertyName = frm.doc.property_name;
                    const invDate = frm.doc.inv_date;

                    if (!propertyName || !invDate) {
                        frappe.msgprint("Property Name or Invoice Date is missing.");
                        return;
                    }

                    const payload = {
                        request: "regenerateInvoice",
                        property_name: propertyName,
                        date: invDate
                    };

                    try {
                        const response = await fetch("https://propmandev.wateron.cc:8881", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify(payload)
                        });

                        if (!response.ok) {
                            throw new Error(`HTTP error! Status: ${response.status}`);
                        }

                        const result = await response.json();
                        frappe.msgprint("Recalculation triggered: " + JSON.stringify(result));

                    } catch (error) {
                        frappe.msgprint("API Call Failed: " + error.message);
                    }
                })();
    },
    approve_and_email_invoice: function(frm) {

        frappe.call({
            method: "propman.propman.doctype.rentalinvoices.rentalinvoices.approve_and_email_invoice",
            args: {

                "doc": frm.doc,
               
            },
        })
        // handle_invoice_action(frm, "approve_email");

        
    },
    view_invoice: function(frm) {

        frappe.call({
            method: "propman.propman.doctype.rentalinvoices.rentalinvoices.view_invoice",
            args: {

                "doc": frm.doc,
               
            },
        })
        // handle_invoice_action(frm, "view");
    }


});


// function handle_invoice_action(frm, action_type) {
//     // Centralized logic for all button actions
//     if (action_type === "recalculate") {
//         // call API or logic
//     } else if (action_type === "approve_email") {
//         // send email logic
//     } else if (action_type === "view") {
//         // open PDF or something
//     }
// }