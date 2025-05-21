frappe.listview_settings['RentalContracts'] = {
    hide_name_column: true,
    
    
    onload: function(listview) {
        
        // frappe.route_options = {};
        // listview.filter_area.clear();
        // listview.refresh();
        
        if (!frappe.user.has_role('Administrator')) {

            // listview.$result.off('click');
            // $(".list-count").hide();
            // $('svg .like-icon[href="#es-solid-heart"]').closest('svg').hide();
            // document.querySelector('.level-item.list-check-all').style.display = 'none';

            // $('.actions-btn-group').hide();
            $('div.menu-btn-group').hide();
            // $(document).ready(function() {
            //     $('.filter-section').hide();
            // });
            // $('div[data-fieldname="name"]').hide();
            // $('div[data-fieldname="property_name"]').hide();
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