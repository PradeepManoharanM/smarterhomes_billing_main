frappe.listview_settings['inv_property'] = {
    hide_name_column: true,

    onload: function (listview) {
        const is_admin = frappe.user.has_role('Administrator');

        // Add your Custom action (visible to everyone)
        listview.page.add_actions_menu_item(__('Custom'), function () {
            const selected = listview.get_checked_items();
            if (!selected.length) {
                frappe.msgprint('Please select at least one record.');
                return;
            }

            frappe.call({
                method: 'billing.billing.doctype.inv_property.inv_property.new_trig',
                args: {
                    names: selected.map(row => row.name)
                },
                callback: function (r) {
                    if (!r.exc) {
                        frappe.msgprint(__('Marked as reviewed'));
                        listview.refresh();
                    }
                }
            });
        });

        if (!is_admin) {
            listview.page.sidebar.toggle(false);

            // Delay to ensure dynamic actions are rendered
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

            }, 1000); // Increased delay to ensure all menu items are loaded
        }

    }
};
