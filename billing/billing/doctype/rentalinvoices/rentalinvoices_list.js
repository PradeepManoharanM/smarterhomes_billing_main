frappe.listview_settings['RentalInvoices'] = {
    onload(listview) {
        const currentYear = new Date().getFullYear();
        const years = [currentYear - 1, currentYear, currentYear + 1];

        const monthMap = [
            { name: 'January', value: 1 },
            { name: 'February', value: 2 },
            { name: 'March', value: 3 },
            { name: 'April', value: 4 },
            { name: 'May', value: 5 },
            { name: 'June', value: 6 },
            { name: 'July', value: 7 },
            { name: 'August', value: 8 },
            { name: 'September', value: 9 },
            { name: 'October', value: 10 },
            { name: 'November', value: 11 },
            { name: 'December', value: 12 }
        ];

        const container = $(`<div style="display: flex; align-items: center; gap: 10px; margin-left: 15px;"></div>`);

        const yearLabel = $('<span style="font-weight: 500;">Year</span>');
        const yearSelect = $('<select class="form-control" style="width: 100px;"></select>');
        years.forEach(year => {
            yearSelect.append(`<option value="${year}">${year}</option>`);
        });

        const monthLabel = $('<span style="font-weight: 500;">Month</span>');
        const monthSelect = $('<select class="form-control" style="width: 140px;"></select>');
        monthMap.forEach(m => {
            monthSelect.append(`<option value="${m.value}">${m.name}</option>`);
        });

        container.append(yearLabel, yearSelect, monthLabel, monthSelect);
        listview.page.$title_area.append(container);

        function applyFilter() {
            const year = yearSelect.val();
            const month = monthSelect.val();

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
        // ✅ Export button
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

        // ✅ Approve button
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

        // 🛑 Hide list view dropdown and sidebar for non-admins
        if (!frappe.user.has_role('Administrator')) {
            listview.page.sidebar.toggle(false); // Hide filter sidebar
            $('.custom-btn-group').hide();       // Hide dropdown in list view header

            setTimeout(() => {
                const toHide = [
                    'Edit',
                    'Assign To',
                    'Clear Assignment',
                    'Apply Assignment Rule',
                    'Add Tags',
                    'Print',
                    'Delete'
                ];

                $('.dropdown-menu .dropdown-item').each(function () {
                    if (toHide.includes($(this).text().trim())) {
                        $(this).hide();
                    }
                });
            }, 300);
        }
    }
};
