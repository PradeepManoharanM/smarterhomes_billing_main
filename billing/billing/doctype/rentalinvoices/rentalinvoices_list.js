frappe.listview_settings['RentalInvoices'] = {
    onload: function (listview) {
        // Rename ID to Invoice Number
        $(".list-row-col span:contains('ID')").each(function () {
            $(this).text("Invoice Number");
        });

        // Add Export button (for all users)
        const export_action = {
            label: __('Export'),
            action: () => listview.export_report()
        };

        // Add Approve button
        const approve_action = {
            label: __('Approve'),
            action: () => {
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
            }
        };

        // First, clear all default action items
        listview.page.clear_actions_menu();

        // Now only add our two buttons
        listview.page.add_actions_menu_item(approve_action.label, approve_action.action);
        listview.page.add_actions_menu_item(export_action.label, export_action.action);

        // Hide UI elements for non-admins (optional)
        if (!frappe.user.has_role('Administrator')) {
            $('div.menu-btn-group').hide();                      // top-right buttons
            listview.page.sidebar.toggle(false);                 // sidebar
            setTimeout(() => $('.custom-btn-group').hide(), 0);  // row-level buttons
        }

        // 📅 Handle single date -> full month logic
        const invoiceDateFilter = listview.page.fields_dict['invoice_date'];
        if (invoiceDateFilter) {
            invoiceDateFilter.$wrapper.find('input').on('change', function () {
                const selectedDate = invoiceDateFilter.get_value();
                if (selectedDate) {
                    const date = frappe.datetime.str_to_obj(selectedDate);
                    const monthStart = frappe.datetime.month_start(date);
                    const monthEnd = frappe.datetime.month_end(date);

                    // Set new filter to whole month
                    frappe.route_options = {
                        invoice_date: ["between", [monthStart, monthEnd]]
                    };

                    // Reload same list to apply new filters
                    frappe.set_route("List", "RentalInvoices");
                }
            });
        }
    },

    refresh: function (listview) {
        // Optional styling tweaks
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
