frappe.listview_settings['RentalInvoices'] = {
    onload(listview) {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;

        // Prevent duplicate rendering
        if ($('#custom-year-month-filter').length > 0) return;

        // Create and append dropdown container
        const $container = $(`
            <div id="custom-year-month-filter" style="display: flex; align-items: center; gap: 8px; margin-left: 20px;">
                <label style="margin: 0;">Year:</label>
                <select id="custom-year" class="input-with-feedback" style="width: 100px;"></select>
                <label style="margin: 0;">Month:</label>
                <select id="custom-month" class="input-with-feedback" style="width: 120px;"></select>
            </div>
        `);

        // Inject into list view title area
        setTimeout(() => {
            listview.page.$title_area.find('.title-text').after($container);

            const $year = $('#custom-year');
            const $month = $('#custom-month');

            // Populate year dropdown
            for (let y = currentYear - 1; y <= currentYear + 1; y++) {
                $year.append(`<option value="${y}">${y}</option>`);
            }
            $year.val(currentYear);

            // Populate month dropdown
            const months = [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ];
            months.forEach((month, index) => {
                $month.append(`<option value="${index + 1}">${month}</option>`);
            });
            $month.val(currentMonth);

            function applyDateFilter() {
                const selectedYear = parseInt($year.val());
                const selectedMonth = parseInt($month.val());

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

            $year.on('change', applyDateFilter);
            $month.on('change', applyDateFilter);

            // Initial filter
            applyDateFilter();
        }, 100); // delay to ensure listview is fully loaded
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
