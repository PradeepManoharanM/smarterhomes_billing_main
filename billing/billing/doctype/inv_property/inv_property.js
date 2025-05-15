// Copyright (c) 2024, Frugal Scientific Pvt.Ltd and contributors
// For license information, please see license.txt

frappe.ui.form.on('inv_property', {
    
    refresh: function (frm) {
        $('.form-sidebar').hide();
        $('.prev-doc').hide();
        $('.next-doc').hide();
        // frm.fields_dict['property_name'].$wrapper.show();
        if (!frappe.user.has_role('Administrator')) {
            $("#navbar-breadcrumbs").css({ 'visibility': 'hidden' });
            // let gatewayButton = $('button[data-doctype="Gateway"]');
            // if (gatewayButton.length) {
            //     gatewayButton.hide(); 
            // }
            
            setTimeout(() => {
                    
                frm.page.menu.find('.dropdown-item:contains("Jump to field")').hide();
                frm.page.menu.find('.dropdown-item:contains("Links")').hide();
                frm.page.menu.find('.dropdown-item:contains("Duplicate")').hide();
                frm.page.menu.find('.dropdown-item:contains("Remind Me")').hide();
                $('div.section-head:contains("Connections")').hide();

            }, 100);
        }
    },

});
