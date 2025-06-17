frappe.listview_settings['RentalInvoices'] = {
    onload: function (listview) {
        // Rename ID column to "Invoice Number"
        $(".list-row-col span:contains('ID')").each(function () {
            $(this).text("Invoice Number");
        });

        // ✅ Export action for all users
        listview.page.add_actions_menu_item(__('Export'), function () {
            listview.export_report();
        });

        // ✅ Approve action
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

        // ✅ Hide UI for non-admins, but DO NOT clear the actions menu!
        if (!frappe.user.has_role('Administrator')) {
            $('div.menu-btn-group').hide();
            listview.page.sidebar.toggle(false);
            setTimeout(() => $('.custom-btn-group').hide(), 0);
            // ❌ Do NOT use listview.page.clear_actions_menu();
        }

        // ✅ Convert selected date to full month filter
        const invoiceDateFilter = listview.page.fields_dict['invoice_date'];
        if (invoiceDateFilter) {
            invoiceDateFilter.$wrapper.find('input').on('change', function () {
                const selectedDate = invoiceDateFilter.get_value();
                if (selectedDate) {
                    const date = frappe.datetime.str_to_obj(selectedDate);
                    const monthStart = frappe.datetime.month_start(date);
                    const monthEnd = frappe.datetime.month_end(date);

                    // Clear old filter and add monthly range
                    listview.filter_area.remove('invoice_date');
                    listview.filter_area.add('RentalInvoices', 'invoice_date', 'between', [monthStart, monthEnd]);
                    listview.run();
                }
            });
        }
    },

    refresh: function (listview) {
        // Style tweaks
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
