frappe.listview_settings['RentalInvoices'] = {
    onload: function (listview) {
        // ✅ Add custom Month filter
        listview.page.add_field({
            fieldtype: 'Select',
            label: 'Month',
            fieldname: 'inv_month',
            options: [
                '', '2025-01', '2025-02', '2025-03', '2025-04', '2025-05',
                '2025-06', '2025-07', '2025-08', '2025-09', '2025-10',
                '2025-11', '2025-12'
            ],
            change: function () {
                const selected = listview.page.fields_dict['inv_month'].get_value();
                if (selected) {
                    const parts = selected.split("-");
                    const year = parseInt(parts[0]);
                    const month = parseInt(parts[1]) - 1;
                    const start = new Date(year, month, 1);
                    const end = new Date(year, month + 1, 0);

                    const start_str = frappe.datetime.obj_to_str(start);
                    const end_str = frappe.datetime.obj_to_str(end);

                    listview.filter_area.clear();
                    listview.filter_area.add([
                        ['RentalInvoices', 'inv_date', 'between', [start_str, end_str]]
                    ]);
                    listview.run();
                }
            }
        });

        // 🛑 Hide elements for non-admin users
        if (!frappe.user.has_role('Administrator')) {
            // Hide sidebar
            listview.page.sidebar.toggle(false);

            // Hide 'New' button
            setTimeout(() => {
                $('.btn[data-label="New"]').hide();
            }, 100);

            // Remove all actions temporarily (added back later selectively)
            listview.page.clear_actions_menu();
        }
    },

    refresh: function (listview) {
        // ✅ Export Button
        listview.page.add_actions_menu_item(__('Export'), function () {
        let filters = listview.get_filters_for_args();

    // 🔴 Remove 'inv_month' UI filter if present
        if (filters['inv_month']) {
            delete filters['inv_month'];
        }

        frappe.call({
            method: "frappe.desk.reportview.export_query",
            args: {
                doctype: listview.doctype,
                file_format_type: "Excel",
                filters: filters,
            },
            callback: function (r) {
                if (!r.exc && r.message && r.message.file_url) {
                    window.location.href = r.message.file_url;
                } else {
                    frappe.msgprint(__('Export failed'));
                }
            }
        });
    });


        // ✅ Approve Button
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

        // ✅ Additional styling tweaks (optional)
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
