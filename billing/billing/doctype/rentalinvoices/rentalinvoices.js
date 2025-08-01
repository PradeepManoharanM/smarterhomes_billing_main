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
    const propertyName = frm.doc.property_name;
    const invDate = frm.doc.inv_date;

    if (!propertyName || !invDate) {
        frappe.msgprint("Please ensure both Property Name and Invoice Date are filled.");
        return;
    }

    frappe.call({
        method: "billing.billing.doctype.rentalinvoices.rentalinvoices.call_recalculate_invoice",
        args: {
            property_name: propertyName,
            date: invDate
        },
        callback: function(r) {
            frappe.msgprint({
                title: "Recalculation Result",
                message: JSON.stringify(r.message),
                indicator: "green"
            });
        },
        error: function(err) {
            frappe.msgprint({
                title: "Recalculation Failed",
                message: "Backend call failed.",
                indicator: "red"
            });
        }
    });
},



    approve_and_email_invoice: function(frm) {
        if (!frm.doc.property_name || !frm.doc.inv_date) {
            frappe.msgprint("Please fill both Property Name and Invoice Date.");
            return;
        }

        const payload = {
            request: "approve",
            property_name: frm.doc.property_name,
            date: frm.doc.inv_date
        };

        fetch('https://propmandev.wateron.cc:8881', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error("HTTP error " + response.status);
            }
            return response.json();
        })
        .then(data => {
            console.log("Success:", data);
            frappe.msgprint("Approval request sent successfully.");
        })
        .catch(error => {
            console.error("Error:", error);
            frappe.msgprint("Failed to send approval request. Check console.");
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