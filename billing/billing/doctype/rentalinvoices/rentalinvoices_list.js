frappe.listview_settings['RentalInvoices'] = {
    onload(listview) {
        const currentYear = new Date().getFullYear();
        const years = [currentYear - 1, currentYear, currentYear + 1];
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        // Create Year Dropdown
        const yearLabel = $(`<label style="margin-left: 10px; font-weight: 500;">Year</label>`);
        const yearSelect = $(`<select class="form-control" style="width: 100px; margin-left: 5px;">
            <option value="">--</option>
            ${years.map(y => `<option value="${y}">${y}</option>`).join('')}
        </select>`);

        // Create Month Dropdown
        const monthLabel = $(`<label style="margin-left: 10px; font-weight: 500;">Month</label>`);
        const monthSelect = $(`<select class="form-control" style="width: 140px; margin-left: 5px;">
            <option value="">--</option>
            ${months.map((name, index) => `<option value="${index + 1}">${name}</option>`).join('')}
        </select>`);

        // Append both filters
        listview.page.$title_area.append(yearLabel).append(yearSelect).append(monthLabel).append(monthSelect);

        function applyDateFilter() {
            const year = yearSelect.val();
            const month = monthSelect.val();

            if (year && month) {
                const start = frappe.datetime.obj_to_str(new Date(parseInt(year), parseInt(month) - 1, 1));
                const end = frappe.datetime.obj_to_str(new Date(parseInt(year), parseInt(month), 0));

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

        // 🛑 Hide sidebar & buttons for non-admin users
        if (!frappe.user.has_role('Administrator')) {
            listview.page.sidebar.toggle(false);
            $('.custom-btn-group').hide();

            setTimeout(() => {
                const itemsToHide = [
                    'Edit', 'Assign To', 'Clear Assignment', 'Apply Assignment Rule',
                    'Add Tags', 'Print', 'Delete'
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
