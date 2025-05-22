// Copyright (c) 2025, Frugal Scientific and contributors
// For license information, please see license.txt

frappe.ui.form.on("RentalContracts", {
	refresh(frm) {

        $('.form-sidebar').hide();
        $('.prev-doc').hide();
        $('.next-doc').hide();
        if (!frappe.user.has_role('Administrator')) {
            
            $("#navbar-breadcrumbs").css({ 'visibility': 'hidden' });
                 
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
