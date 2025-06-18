frappe.listview_settings['RentalInvoices'] = {
    onload(listview) {
        const currentYear = new Date().getFullYear();
        const years = [currentYear - 1, currentYear, currentYear + 1];

        const months = [
            { name: "January", value: 1 },
            { name: "February", value: 2 },
            { name: "March", value: 3 },
            { name: "April", value: 4 },
            { name: "May", value: 5 },
            { name: "June", value: 6 },
            { name: "July", value: 7 },
            { name: "August", value: 8 },
            { name: "September", value: 9 },
            { name: "October", value: 10 },
            { name: "November", value: 11 },
            { name: "December", value: 12 }
        ];

        // Create container
        const filterContainer = $(`<div style="display: flex; align-items: center; gap: 10px; margin-left: 15px;"></div>`);

        // Year dropdown
        const yearSelect = $('<select class="form-control" style="width: 100px;"></select>');
        years.forEach(year => {
            yearSelect.append(`<option value="${year}">${year}</option>`);
        });

        // Month dropdown
        const monthSelect = $('<select class="form-control" style="width: 150px;"></select>');
        months.forEach(month => {
            monthSelect.append(`<option value="${month.value}">${month.name}</option>`);
        });

        // Add labels and dropdowns
        filterContainer.append('<label style="margin: 0;">Year</label>');
        filterContainer.append(yearSelect);
        filterContainer.append('<label style="margin: 0;">Month</label>');
        filterContainer.append(monthSelect);

        listview.page.$title_area.append(filterContainer);

        // Filter logic
        function applyDateFilter() {
            const year = parseInt(yearSelect.val());
            const month = parseInt(monthSelect.val());

            if (!isNaN(year) && !isNaN(month)) {
                const start = frappe.datetime.obj_to_str(new Date(year, month - 1, 1));
                const end = frappe.datetime.obj_to_str(new Date(year, month, 0));

                listview.filter_area.clear();
                listview.filter_area.add([
                    ['RentalInvoices', 'inv_date', 'between', [start, end]]
                ]);
                listview.run();
            }
        }

        yearSelect.on('change', applyDateFilter);
        monthSelect.on('change', applyDateFilter);
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

        // Hide sidebar and dropdown button for non-admin users
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
