frappe.listview_settings['Inv_rental'] = {
    // hide_name_column: true,
    // listview.page.fields_dict['name'].$wrapper.find('label').text('Invoice Number');
    
    
    onload: function(listview) {
        listview.page.fields_dict['name'].$wrapper.find('label').text('Invoice Number');
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
                 let labelEl = document.querySelector('.list-view-form .title-text');
                if (labelEl && labelEl.innerText === 'Inv_rental') {
                labelEl.innerText = 'Rental Invoice';
                clearInterval(interval);
                }
            }, 0);
            
            listview.page.clear_actions_menu();
            listview.page.add_actions_menu_item(__('Export'), function() {
            listview.export_report();
        })
    }
        // listview.columns = [
        //     {
        //         label: __("Invoice Number"),
        //         fieldname: "name",
        //         fieldtype: "Data",
        //         width: 250  // Increase width here (default ~180)
        //     },
        //     {
        //         label: __("Invoice Date"),
        //         fieldname: "invoice_date",
        //         fieldtype: "Date",
        //         width: 120
        //     },
            // {
            //     label: __("Property"),
            //     fieldname: "property",
            //     fieldtype: "Data",
            //     width: 220
            // },
            // {
            //     label: __("Previous Balance"),
            //     fieldname: "previous_balance",
            //     fieldtype: "Currency",
            //     width: 120
            // },
            // {
            //     label: __("Total Payable"),
            //     fieldname: "total_payable",
            //     fieldtype: "Currency",
            //     width: 120
            // },
            // {
            //     label: __("Invoice Status"),
            //     fieldname: "invoice_status",
            //     fieldtype: "Data",
            //     width: 150
            // },
            // {
            //     label: __("Amount Received"),
            //     fieldname: "amount_received",
            //     fieldtype: "Currency",
            //     width: 120
            // }
        // ];
    
    },

};