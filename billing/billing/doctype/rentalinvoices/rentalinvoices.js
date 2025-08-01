// Copyright (c) 2025, Frugal Scientific and contributors
// For license information, please see license.txt

frappe.ui.form.on("RentalInvoices", {
        refresh: function (frm) {
            $('.form-sidebar').hide();
            $('.prev-doc').hide();
            $('.next-doc').hide();
            // frm.disable_save();
            set_fields_readonly_based_on_inv_date(frm);
            toggle_recalculate_button(frm);
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


   re_calculate_invoice: function (frm) {
    (async () => {
        const propertyName = frm.doc.property_name;
        const invDate = frm.doc.inv_date;

        if (!propertyName || !invDate) {
            frappe.msgprint("Please ensure both Property Name and Invoice Date are filled.");
            return;
        }

        const formattedDate = frappe.datetime.str_to_obj(invDate).toISOString().split('T')[0];

        const payload = {
            property_name: propertyName,
            date: formattedDate
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
                const errorText = await response.text();
                throw new Error(`API request failed with status ${response.status}: ${errorText}`);
            }

            const result = await response.json();

            frappe.msgprint({
                title: "Recalculation Success",
                message: JSON.stringify(result),
                indicator: "green"
            });

        } catch (error) {
            frappe.msgprint({
                title: "Recalculation Failed",
                message: error.message,
                indicator: "red"
            });
        }
    })();
},


    approve_and_email_invoice: function(frm) {
        // Prepare dynamic data from the form
        const payload = {
            property_name: frm.doc.property_name,
            date: frm.doc.posting_date || frappe.datetime.get_today()
        };

        frappe.call({
            method: "frappe.client.post",
            args: {
                url: "https://propmandev.wateron.cc",
                headers: {
                    "Content-Type": "application/json"
                },
                data: payload
            },
            callback: function(response) {
                frappe.msgprint("API call successful");
                console.log(response.message);
            },
            error: function(err) {
                frappe.msgprint("API call failed");
                console.error(err);
            }
        });
    },
    view_invoice: function(frm) {

        frappe.call({
            method: "propman.propman.doctype.rentalinvoices.rentalinvoices.view_invoice",
            args: {

                "doc": frm.doc,
               
            },
        })
        // handle_invoice_action(frm, "view");
    },
    discount: function(frm) {
        toggle_recalculate_button(frm);
    }

});

function set_fields_readonly_based_on_inv_date(frm) {
    if (!frm.doc.inv_date) return;

    const invDate = frappe.datetime.str_to_obj(frm.doc.inv_date);
    const today = frappe.datetime.str_to_obj(frappe.datetime.get_today());

    const sameMonth = (invDate.getMonth() === today.getMonth()) &&
                      (invDate.getFullYear() === today.getFullYear());

    const fields = ['discount', 'amt_rcvd', 'tds'];

    fields.forEach(field => {
        frm.set_df_property(field, 'read_only', !sameMonth);
    });

    // If switching from read-only to editable, refresh the fields to reflect it
    frm.refresh_fields(fields);
}

function toggle_recalculate_button(frm) {
    const is_dirty = frm.is_dirty();  // Checks if anything changed
    const changed_discount = frm.doc.discount !== frm.__last_sync?.discount;

    setTimeout(() => {
        const button = $('button:contains("Re calculate Invoice")');
        if (changed_discount) {
            button.show();
        } else {
            button.hide();
        }
    }, 100);
}


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