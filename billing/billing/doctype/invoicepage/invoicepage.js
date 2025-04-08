frappe.ui.form.on("invoicePage", {
	refresh: function(frm) {
        frm.fields_dict.show_contracts.$wrapper.find('button').on('click', function() {
            let from_date = frm.doc.from_date;
            let to_date = frm.doc.to_date;
            let property = frm.doc.contract_property;

            // if (!from_date || !to_date || !property) {
            //     frappe.msgprint(__('Please select From Date, To Date, and Property.'));
            //     return;
            // }

            frappe.set_route('List', 'inv_property', {
               
                'property_name': property
            });
        });
    },

    show_all_invoices_for_this_month: function(frm) {
        let selected_month = frm.doc.month;

        if (!selected_month) {
            frappe.throw(__('Please select a month.'));
        }

        let date_obj = frappe.datetime.str_to_obj(selected_month);
        let year = date_obj.getFullYear();
        let month = (date_obj.getMonth() + 1).toString().padStart(2, '0');
        let last_day = new Date(year, month, 0).getDate(); // Auto-adjusts for different month lengths
        

        frappe.set_route('List', 'inv_rental', {

            inv_date: ["between", [`${year}-${month}-01`, `${year}-${month}-${last_day}`]]

        });

    },

    show_all_invoices_for_this_property: function(frm) {
        let property = frm.doc.inv_property;

        if (!property) {
            frappe.throw(__('Please select a property.'));
        }

        frappe.set_route('List', 'inv_rental', {

            'property_name': property

        });
    }
});
