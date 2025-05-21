// Copyright (c) 2025, Frugal Scientific and contributors
// For license information, please see license.txt

frappe.ui.form.on("RentalInvoices", {
    refresh: function (frm) {
            $('.form-sidebar').hide();
            $('.prev-doc').hide();
            $('.next-doc').hide();
            frm.disable_save();
            // frm.fields_dict['property_name'].$wrapper.show();
            if (!frappe.user.has_role('Administrator')) {
                $("#navbar-breadcrumbs").css({ 'visibility': 'hidden' });
                // let gatewayButton = $('button[data-doctype="Gateway"]');
                // if (gatewayButton.length) {
                //     gatewayButton.hide(); 
                // }
                frm.disable_save();
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
        frm.save();
        frm.reload_doc();
    },

    approve_and_email_invoice: function (frm) {
        frm.save();
        frm.reload_doc();
    },

    view_invoice: function (frm) {
        frm.save();
        frm.reload_doc();
    },


});
