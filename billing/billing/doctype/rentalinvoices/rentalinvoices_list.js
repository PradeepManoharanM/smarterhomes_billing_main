frappe.listview_settings['RentalInvoices'] = {
    onload: function (listview) {
        // Rename ID to Invoice Number
        $(".list-row-col span:contains('ID')").each(function () {
            $(this).text("Invoice Number");
        });

        // Clear existing actions and re-add Export + Approve
        listview.page.clear_actions_menu();

        // ✅ Working Export even for non-admins
        listview.page.add_actions_menu_item(__('Export'), function () {
            // This triggers the native export dialog
            frappe.set_route("query-report", "RentalInvoices");
        });

        // ✅ Approve selected
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

        // Hide only sidebar + New button (not export!)
        if (!frappe.user.has_role('Administrator')) {
            listview.page.sidebar.toggle(false);
            setTimeout(() => {
                $('.btn[data-label="New"]').hide(); // Only hides 'New' button
            }, 0);
        }

        // ✅ Correct monthly filter for inv_date
        const invDateFilter = listview.page.fields_dict['inv_date'];
        if (invDateFilter) {
            invDateFilter.$wrapper.find('input').on('change', function () {
                const selectedDate = invDateFilter.get_value();

                if (selectedDate) {
                    const dateObj = frappe.datetime.str_to_obj(selectedDate);
                    const monthStart = frappe.datetime.month_start(dateObj);
                    const monthEnd = frappe.datetime.month_end(dateObj);

                    // Debug log (optional):
                    console.log("Filtering inv_date between:", monthStart, "and", monthEnd);

                    // Apply date range filter directly
                    listview.filter_area.clear();
                    listview.filter_area.add([
                        [listview.doctype, 'inv_date', 'between', [monthStart, monthEnd]]
                    ]);
                    listview.run();
                }
            });
        }
    },

    refresh: function (listview) {
        // Style tweaks
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
