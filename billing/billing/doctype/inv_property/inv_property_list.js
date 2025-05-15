frappe.listview_settings['inv_property'] = {
    hide_name_column: true,
    
    
    onload: function(listview) {

        listview.page.add_actions_menu_item('Custom', function() {
            const selected = listview.get_checked_items();
            if (!selected.length) {
                frappe.msgprint('Please select at least one record.');
                return;
            }

            frappe.call({
                method: 'billing.billing.doctype.inv_property.inv_property.new_trig', // Backend Python function
                args: {
                    names: selected.map(row => row.name)
                },
                callback: function(r) {
                    if (!r.exc) {
                        frappe.msgprint(__('Marked as reviewed'));
                        listview.refresh();
                    }
                }
            });
        });
        
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

    setTimeout(() => {
            // Adjust column width using CSS
            const columnTitle = 'Property Name'; // Replace with your column label
            $('th:contains("' + columnTitle + '")').css('width', '50px');
            $('td[data-fieldname="property_name"]').css('width', '50px');
        }, 500);
    },
};