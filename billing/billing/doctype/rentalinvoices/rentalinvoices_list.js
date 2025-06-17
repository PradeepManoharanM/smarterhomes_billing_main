frappe.listview_settings['RentalInvoices'] = {
    onload: function (listview) {
        // Rename ID to Invoice Number
        $(".list-row-col span:contains('ID')").each(function () {
            $(this).text("Invoice Number");
        });

        // Allow Export and Approve buttons for all users
        listview.page.clear_actions_menu();
        listview.page.add_actions_menu_item(__('Export'), function () {
            listview.export_report();
        });

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

        // Hide sidebar and extra buttons for non-admin users
        if (!frappe.user.has_role('Administrator')) {
            // Hide sidebar only
            listview.page.sidebar.toggle(false);

            // Hide only unwanted buttons, not action menu
            setTimeout(() => {
                $('.btn[data-label="New"]').hide();
            }, 0);
        }

        // Filter by month on inv_date field
        const invDateFilter = listview.page.fields_dict['inv_date'];
        if (invDateFilter) {
            invDateFilter.$wrapper.find('input').on('change', function () {
                const selectedDate = invDateFilter.get_value();
                if (selectedDate) {
                    const date = frappe.datetime.str_to_obj(selectedDate);
                    const monthStart = frappe.datetime.month_start(date);
                    const monthEnd = frappe.datetime.month_end(date);

                    // Apply monthly filter directly
                    listview.filter_area.clear();  // Clear existing filters
                    listview.filter_area.add([[listview.doctype, 'inv_date', 'between', [monthStart, monthEnd]]]);
                    listview.run();
                }
            });
        }
    },

    refresh: function (listview) {
        // Styling tweaks
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
