frappe.listview_settings['RentalContracts'] = {
    hide_name_column: true,
    
    
    onload: function(listview) {
        
        if (!frappe.user.has_role('Administrator')) {

            $('div.menu-btn-group').hide();
            
            listview.page.sidebar.toggle(false);
            setTimeout(function() {
                
                $('.custom-btn-group').hide();
            }, 0);
            
            listview.page.clear_actions_menu();
            listview.page.add_actions_menu_item(__('Export'), function() {
            listview.export_report();
        })
    }
    },

};