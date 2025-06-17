frappe.listview_settings['RentalInvoices'] = {
    onload(listview) {
        // ✅ Month options without year prefix
        const monthOptions = ['', '01', '02', '03', '04', '05', '06',
                              '07', '08', '09', '10', '11', '12'];

        const monthSelect = $(`<select class="form-control" style="width: 150px; margin-left: 10px;">
            ${monthOptions.map(m => `<option value="${m}">${m ? `Month ${m}` : 'Select Month'}</option>`).join('')}
        </select>`);

        listview.page.$title_area.append(monthSelect);

        monthSelect.on('change', function () {
            const selectedMonth = $(this).val();
            if (selectedMonth) {
                const year = frappe.datetime.get_today().split('-')[0]; // current year
                const start = frappe.datetime.obj_to_str(new Date(parseInt(year), parseInt(selectedMonth) - 1, 1));
                const end = frappe.datetime.obj_to_str(new Date(parseInt(year), parseInt(selectedMonth), 0));

                listview.filter_area.clear();
                listview.filter_area.add([
                    ['RentalInvoices', 'inv_date', 'between', [start, end]]
                ]);
                listview.run();
            }
        });

        // 🛑 Hide sidebar and New button for non-admin users
        if (!frappe.user.has_role('Administrator')) {
            listview.page.sidebar.toggle(false);
            setTimeout(() => {
                $('.btn[data-label="New"]').hide();
            }, 100);
            listview.page.clear_actions_menu();
        }
    },

    refresh(listview) {
        // ✅ Export button only for Administrator
        if (frappe.user.has_role('Administrator')) {
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
        }

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
    }
};
