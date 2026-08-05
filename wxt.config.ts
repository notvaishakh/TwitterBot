import { defineConfig } from "wxt";

export default defineConfig({
  manifest:
  {
    name: "X-Helper",

    description:
      "Filter verified replies and posts on X by badge type.",

    permissions:
    [
      "storage",
    ],

    /*
     * Icon shown in the extensions menu and add-ons manager.
     */
    icons:
    {
      16: "/x-helper-icon.png",
      32: "/x-helper-icon.png",
      48: "/x-helper-icon.png",
      96: "/x-helper-icon.png",
      128: "/x-helper-icon.png",
    },

    /*
     * Icon and tooltip shown on the browser toolbar.
     * WXT converts this to browser_action for Firefox MV2.
     */
    action:
    {
      default_title: "X-Helper",

      default_icon:
      {
        16: "/x-helper-icon.png",
        32: "/x-helper-icon.png",
        48: "/x-helper-icon.png",
        96: "/x-helper-icon.png",
        128: "/x-helper-icon.png",
      },
    },

    /*
     * Stable Firefox extension identity and required
     * no-data-collection declaration.
     */
    browser_specific_settings:
    {
      gecko:
      {
        id: "x-helper@notvaishakh",

        data_collection_permissions:
        {
          required:
          [
            "none",
          ],
        },
      },
    },
  },
});