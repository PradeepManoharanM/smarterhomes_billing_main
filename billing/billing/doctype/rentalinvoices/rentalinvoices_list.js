frappe.listview_settings['RentalInvoices'] = {
    onload(listview) {
        const currentYear = new Date().getFullYear();

        // Add dropdown container
        const $container = $(`<div style="display: flex; gap: 10px; margin-left: 15px;"></div>`);

        // Year dropdown
        const yearDropdown = $('<select class="form-control" style="width: 100px;"></select>');
        for (let y = currentYear - 1; y <= currentYear + 1; y++) {
            yearDropdown.append(`<option value="${y}">${y}</option>`);
        }

        // Month dropdown with full names
        const months = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        const monthDropdown = $('<select class="form-control" style="width: 150px;"></select>');
        months.forEach((month, index) => {
            monthDropdown.append(`<option value="${index + 1}">${month}</option>`);
        });

        // Append dropdowns to the container
        $container.append('<label>Year</label>');
        $container.append(yearDropdown);
        $container.append('<label>Month</label>');
        $container.append(monthDropdown);

        // Append to title area
        listview.page.$title_area.append($container);

        // Apply filter logic
        function applyDateFilter() {
            const selectedYear = parseInt(yearDropdown.val());
            const selectedMonth = parseInt(monthDropdown.val());

            if (!isNaN(selectedYear) && !isNaN(selectedMonth)) {
                const start = frappe.datetime.obj_to_str(new Date(selectedYear, selectedMonth - 1, 1));
                const end = frappe.datetime.obj_to_str(new Date(selectedYear, selectedMonth, 0));
                listview.filter_area.clear();
                listview.filter_area.add([
                    ['RentalInvoices', 'inv_date', 'between', [start, end]]
                ]);
                listview.run();
            }
        }

        yearDropdown.on('change', applyDateFilter);
        monthDropdown.on('change', applyDateFilter);
    },

    refresh(listview) {
        // Export Button
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

        // Approve Button
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

        // Hide buttons for non-admin users
        if (!frappe.user.has_role('Administrator')) {
            listview.page.sidebar.toggle(false);
            $('.custom-btn-group').hide();
        }
    }
};
