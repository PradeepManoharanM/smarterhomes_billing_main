frappe.listview_settings['RentalInvoices'] = {
    onload: function (listview) {
        // Rename ID to Invoice Number
        $(".list-row-col span:contains('ID')").each(function () {
            $(this).text("Invoice Number");
        });

        // Clear existing actions
        listview.page.clear_actions_menu();

        // ✅ Export Action - works for non-admins
        listview.page.add_actions_menu_item(__('Export'), function () {
            const filters = listview.get_filters_for_args();
            frappe.call({
                method: "frappe.desk.reportview.export_query",
                args: {
                    doctype: listview.doctype,
                    file_type: "Excel", // or "CSV" if needed
                    filters: filters,
                },
                callback: function (r) {
                    if (!r.exc) {
                        window.location.href = r.message.file_url;
                    }
                }
            });
        });

        // ✅ Approve selected rows
        listview.page.add_actions_menu_item(__('Export'), function () {
    const filters = listview.get_filters_for_args();

    frappe.call({
        method: "frappe.desk.reportview.export_query",
        args: {
            doctype: listview.doctype,
            file_format_type: "Excel", // ✅ Frappe v15+ expects this key
            filters: filters,
        },
        callback: function (r) {
            if (!r.exc && r.message && r.message.file_url) {
                window.location.href = r.message.file_url;
            } else {
                frappe.msgprint(__('Unable to export file.'));
            }
        }
    });
});


        // ✅ Hide sidebar & New button for non-admin users
        if (!frappe.user.has_role('Administrator')) {
            listview.page.sidebar.toggle(false);
            setTimeout(() => {
                $('.btn[data-label="New"]').hide();
            }, 0);
        }

        // ✅ inv_date filter for whole month
        const invDateFilter = listview.page.fields_dict['inv_date'];
        if (invDateFilter) {
            invDateFilter.$wrapper.find('input').on('change', function () {
                const selectedDate = invDateFilter.get_value();
                if (selectedDate) {
                    const dateObj = new Date(selectedDate); // ✅ safer than frappe.datetime.str_to_obj
                    const monthStart = frappe.datetime.month_start(dateObj);
                    const monthEnd = frappe.datetime.month_end(dateObj);

                    listview.filter_area.clear();
                    listview.filter_area.add([
                        [listview.doctype, 'inv_date', 'between', [monthStart, monthEnd]]
                    ]);
                    listview.run();
                }
            });
        }
    },

    refresh: function (listview) {
        // UI styling tweaks
        document.querySelectorAll('.list-row-col').forEach(col => {
            col.style.minWidth = '120px';
            col.style.maxWidth = '120px';
        });

        document.querySelectorAll('.list-subject').forEach(col => {
            col.style.minWidth = '300px';
            col.style.maxWidth = '300px';
        });

        const main_container = document.querySelector('.frappe-list');
        if (main_container) main_container.style.overflowX = 'auto';

        document.querySelectorAll('.list-row-head, .list-row-container').forEach(col => {
            col.style.width = 'max-content';
        });

        document.querySelectorAll('.list-row .level-right').forEach(col => {
            col.style.flex = 'max-content';
        });
    }
};
