frappe.listview_settings['RentalInvoices'] = {
    onload: function (listview) {
        // Ensure actions menu has only Export and Approve
        setTimeout(() => {
            listview.page.clear_actions_menu();

            // ✅ Export (works for users)
            listview.page.add_actions_menu_item(__('Export'), function () {
                frappe.query_reports['RentalInvoices']?.execute
                    ? frappe.query_reports['RentalInvoices'].execute()
                    : listview.export_report && listview.export_report();
            });

            // ✅ Approve
            listview.page.add_actions_menu_item(__('Approve'), function () {
                const selected = listview.get_checked_items();
                if (!selected.length) {
                    frappe.msgprint("Please select at least one row to approve.");
                    return;
                }

                selected.forEach(row => {
                    frappe.call({
                        method: 'billing.billing.doctype.rentalinvoices.rentalinvoices.approve_action',
                        args: { docname: row.name },
                        callback: function (r) {
                            if (!r.exc) {
                                frappe.msgprint(`Approved: ${row.name}`);
                                listview.refresh();
                            }
                        }
                    });
                });
            });
        }, 200);

        // ✅ Fix filter for inv_date to convert to full month
        const dateField = listview.page.fields_dict['inv_date'];
        if (dateField) {
            dateField.$wrapper.find('input').off('change').on('change', function () {
                const selectedDate = dateField.get_value();
                if (selectedDate) {
                    const date = frappe.datetime.str_to_obj(selectedDate);
                    const monthStart = frappe.datetime.month_start(date);
                    const monthEnd = frappe.datetime.month_end(date);

                    frappe.route_options = {
                        inv_date: ["between", [monthStart, monthEnd]]
                    };
                    frappe.set_route("List", "RentalInvoices");
                }
            });
        }
    },

    refresh: function (listview) {
        // Optional list styling
        document.querySelectorAll('.list-row-col').forEach(col => {
            col.style.minWidth = '120px';
            col.style.maxWidth = '120px';
        });

        document.querySelectorAll('.list-subject').forEach(col => {
            col.style.minWidth = '300px';
            col.style.maxWidth = '300px';
        });

        const main_container = document.querySelector('.frappe-list');
        if (main_container) main_container.style.overflowX = 'auto';

        document.querySelectorAll('.list-row-head, .list-row-container').forEach(col => {
            col.style.width = 'max-content';
        });

        document.querySelectorAll('.list-row .level-right').forEach(col => {
            col.style.flex = 'max-content';
        });
    }
};
