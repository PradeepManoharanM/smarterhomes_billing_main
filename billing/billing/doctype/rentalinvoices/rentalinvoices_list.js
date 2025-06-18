frappe.listview_settings['RentalInvoices'] = {
    onload(listview) {
        const currentYear = new Date().getFullYear();
        const years = [currentYear - 1, currentYear, currentYear + 1];

        const monthMap = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        // Create a container to hold both dropdowns
        const container = $(`<div style="display: flex; align-items: center; gap: 10px; margin-left: 15px;"></div>`);

        // Year dropdown
        const yearSelect = $('<select class="form-control" style="width: 100px;"></select>');
        years.forEach(y => {
            yearSelect.append(`<option value="${y}">${y}</option>`);
        });

        // Month dropdown
        const monthSelect = $('<select class="form-control" style="width: 140px;"></select>');
        monthMap.forEach((month, index) => {
            monthSelect.append(`<option value="${index + 1}">${month}</option>`);
        });

        // Add labels and dropdowns to the container
        container.append('<label style="margin-bottom: 0;">Year</label>', yearSelect);
        container.append('<label style="margin-bottom: 0;">Month</label>', monthSelect);

        // Append to title area
        listview.page.$title_area.append(container);

        // Apply filter logic on change
        function applyFilter() {
            const year = parseInt(yearSelect.val());
            const month = parseInt(monthSelect.val());

            if (year && month) {
                const start = frappe.datetime.obj_to_str(new Date(year, month - 1, 1));
                const end = frappe.datetime.obj_to_str(new Date(year, month, 0));
                listview.filter_area.clear();
                listview.filter_area.add([
                    ['RentalInvoices', 'inv_date', 'between', [start, end]]
                ]);
                listview.run();
            }
        }

        yearSelect.on('change', applyFilter);
        monthSelect.on('change', applyFilter);
    },

    refresh(listview) {
        // ✅ Export button (visible to all)
        listview.page.add_actions_menu_item(__('Export'), function () {
            const filters = listview.get_filters_for_args();
            frappe.call({
                method: "frappe.desk.reportview.export_query",
                args: {
                    doctype: listview.doctype,
                    file_format_type: "Excel",
                    filters: filters,
                    file_name: listview.doctype + "_Export"
                },
                callback: function (r) {
                    if (!r.exc && r.message && r.message.file_url) {
                        window.open(r.message.file_url);
                    } else {
                        frappe.msgprint(__('Export failed.'));
                    }
                }
            });
        });

        // ✅ Approve button (visible to all)
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

        // 🛑 Hide sidebar and dropdown for non-admin users
        if (!frappe.user.has_role('Administrator')) {
            listview.page.sidebar.toggle(false);
            $('.custom-btn-group').hide();

            setTimeout(() => {
                const itemsToHide = [
                    'Edit',
                    'Assign To',
                    'Clear Assignment',
                    'Apply Assignment Rule',
                    'Add Tags',
                    'Print',
                    'Delete'
                ];

                $('.dropdown-menu .dropdown-item').each(function () {
                    const label = $(this).text().trim();
                    if (itemsToHide.includes(label)) {
                        $(this).hide();
                    }
                });
            }, 300);
        }
    }
};
