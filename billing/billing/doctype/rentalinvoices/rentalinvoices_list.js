frappe.listview_settings['RentalInvoices'] = {
    onload: function (listview) {
        // ✅ Add a month selector outside filters (won't go to backend)
        listview.page.add_inner_button(__('Filter by Month'), function () {}, 'More'); // placeholder

        const month_field = listview.page.add_field({
            fieldtype: 'Select',
            label: 'Select Month',
            fieldname: 'inv_month_selector',
            options: [
                '',
                '2025-01', '2025-02', '2025-03', '2025-04', '2025-05',
                '2025-06', '2025-07', '2025-08', '2025-09',
                '2025-10', '2025-11', '2025-12'
            ],
            change: function () {
                const selected = month_field.get_value();
                if (selected) {
                    const [year, month] = selected.split('-');
                    const start = frappe.datetime.obj_to_str(new Date(parseInt(year), parseInt(month) - 1, 1));
                    const end = frappe.datetime.obj_to_str(new Date(parseInt(year), parseInt(month), 0));

                    listview.filter_area.clear(); // Clear existing filters
                    listview.filter_area.add([
                        ['RentalInvoices', 'inv_date', 'between', [start, end]]
                    ]);
                    listview.run();
                }
            }
        });

        // 🛑 Hide UI for non-admin users
        if (!frappe.user.has_role('Administrator')) {
            listview.page.sidebar.toggle(false); // hide sidebar

            setTimeout(() => {
                $('.btn[data-label="New"]').hide(); // hide new button
            }, 100);

            listview.page.clear_actions_menu();
        }
    },

    refresh: function (listview) {
        // ✅ Export Button - only valid filters passed
        listview.page.add_actions_menu_item(__('Export'), function () {
            let filters = listview.get_filters_for_args();

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
    }
};
