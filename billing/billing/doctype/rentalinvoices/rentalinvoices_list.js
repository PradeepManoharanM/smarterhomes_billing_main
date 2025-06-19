frappe.listview_settings['RentalInvoices'] = {
    onload(listview) {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;

        // Avoid duplicates
        if ($('#year-month-filter').length) return;

        // Create container
        const $filterContainer = $(`
            <div id="year-month-filter" style="display: flex; align-items: center; gap: 10px; margin-top: 10px;">
                <label style="margin: 0;">Year:</label>
                <select id="year-dropdown" class="input-with-feedback" style="width: 100px;"></select>
                <label style="margin: 0;">Month:</label>
                <select id="month-dropdown" class="input-with-feedback" style="width: 150px;"></select>
            </div>
        `);

        // Append to page form (most visible and reliable spot)
        listview.page.page_form.append($filterContainer);

        // Populate year dropdown
        const $yearDropdown = $('#year-dropdown');
        for (let y = currentYear - 1; y <= currentYear + 1; y++) {
            $yearDropdown.append(`<option value="${y}">${y}</option>`);
        }
        $yearDropdown.val(currentYear);

        // Populate month dropdown
        const $monthDropdown = $('#month-dropdown');
        const months = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        months.forEach((month, index) => {
            $monthDropdown.append(`<option value="${index + 1}">${month}</option>`);
        });
        $monthDropdown.val(currentMonth);

        // Apply filters on change
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

        // Initial run
        applyDateFilter();
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

        // Hide sidebar and buttons for non-admins
        if (!frappe.user.has_role('Administrator')) {
            listview.page.sidebar.toggle(false);
            $('.custom-btn-group').hide();
            listview.page.sidebar.hide();

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

            }, 1000);
        }
    }
};
