frappe.listview_settings['RentalInvoices'] = {
    // hide_name_column: true,
    // listview.page.fields_dict['name'].$wrapper.find('label').text('Invoice Number');
    
    
    onload: function(listview) {
        $(".list-row-col span:contains('ID')").each(function() {
            $(this).text("Invoice Number");
        });
      
        
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

    refresh: function (listview) {
        // Set width for each list row column
        document.querySelectorAll('.list-row-col').forEach(function (col) {
            col.style.minWidth = '120px';
            col.style.maxWidth = '120px';
        });

        // Set width for the subject column
        document.querySelectorAll('.list-subject').forEach(function (col) {
            col.style.minWidth = '200px';
            col.style.maxWidth = '200px';
        });

        document.querySelectorAll('.list-subject').forEach(function (col) {
            col.style.minWidth = '300px';
            col.style.maxWidth = '300px';
        });

        let main_container = document.querySelector('.frappe-list');
        if (main_container) {
            main_container.style.overflowX = 'auto';
        }
        document.querySelectorAll('.list-row-head, .list-row-container').forEach(function(col) {
            col.style.width = 'max-content';
        });
        document.querySelectorAll('.list-row .level-right').forEach(function(col) {
            col.style.flex = 'max-content';
        }); 
    }

};