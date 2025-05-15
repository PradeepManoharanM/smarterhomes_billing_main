frappe.listview_settings['inv_property'] = {
    hide_name_column: true,

    onload: function(listview) {

        if (!frappe.user.has_role('Administrator')) {
            $('div.menu-btn-group').hide();
            listview.page.sidebar.toggle(false);

            setTimeout(function() {
                $('.custom-btn-group').hide();
            }, 0);

            listview.page.clear_actions_menu();

            listview.page.add_actions_menu_item(__('Export'), function () {
                listview.export_report();
            });

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
        }

    }
};
