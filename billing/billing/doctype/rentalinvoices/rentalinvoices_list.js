frappe.listview_settings['RentalInvoices'] = {
    onload(listview) {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;

        // Prevent duplicate injection
        if ($('#custom-year-month-filter').length) return;

        const $container = $(`
            <div id="custom-year-month-filter" style="display: flex; align-items: center; gap: 10px; margin-left: 20px;">
                <label style="margin: 0;">Year:</label>
                <select id="year-dropdown" class="input-with-feedback" style="width: 100px;"></select>
                <label style="margin: 0;">Month:</label>
                <select id="month-dropdown" class="input-with-feedback" style="width: 120px;"></select>
            </div>
        `);

        // Add to title area (beside 'RentalInvoices' title)
        listview.page.$title_area.append($container);

        const $yearDropdown = $('#year-dropdown');
        for (let y = currentYear - 1; y <= currentYear + 1; y++) {
            $yearDropdown.append(`<option value="${y}">${y}</option>`);
        }
        $yearDropdown.val(currentYear);

        const $monthDropdown = $('#month-dropdown');
        const months = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        months.forEach((month, index) => {
            $monthDropdown.append(`<option value="${index + 1}">${month}</option>`);
        });
        $monthDropdown.val(currentMonth);

        function applyDateFilter() {
            const selectedYear = parseInt($yearDropdown.val());
            const selectedMonth = parseInt($monthDropdown.val());

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

        $yearDropdown.on('change', applyDateFilter);
        $monthDropdown.on('change', applyDateFilter);

        applyDateFilter();
    },

    refresh(listview) {
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

        if (!frappe.user.has_role('Administrator')) {
            listview.page.sidebar.toggle(false);
            $('.custom-btn-group').hide();
        }
    }
};
