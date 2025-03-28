<template>
    <div class="open-file-bar oc-grid-collapse oc-flex oc-flex-bottom">
      <div class="oc-flex oc-p-s open-file-bar-inner">
        <template v-if="resource">
          <div class="open-file-bar-resource-wrapper">
            <oc-resource
              id="open-file-bar-resource"
              :is-thumbnail-displayed="false"
              :resource="resource"
            />
            <oc-button
              id="oc-openfile-contextmenu-trigger"
              v-oc-tooltip="contextMenuLabel"
              :aria-label="contextMenuLabel"
              appearance="raw"
            >
              <oc-icon name="more-2" color="var(--oc-color-swatch-inverse-default)" />
            </oc-button>
          </div>

          <template>
            <oc-drop
              drop-id="oc-openfile-contextmenu"
              toggle="#oc-openfile-contextmenu-trigger"
              mode="click"
              close-on-click
              padding-size="small"
              @click.native.stop.prevent
            >
              <context-actions :items="[resource].filter(Boolean)" deactivate-apps="true" :space="getSpace(resource)"/>
            </oc-drop>
          </template>

          <div>
            <oc-button
              id="app-top-bar-close"
              variation="inverse"
              :aria-label="$gettext('Close')"
              size="small"
              @click="$emit('close')"
            >
              <oc-icon name="close" size="small" />
            </oc-button>
          </div>
        </template>
      </div>
    </div>
  </template>

  <script lang="ts">
  import { defineComponent } from 'vue'
  import ContextActions from 'web-app-files/src/components/FilesList/ContextActions.vue'
  import { useStore } from 'web-pkg/src/composables'
  import { buildShareSpaceResource, SpaceResource } from 'web-client/src/helpers'

  export default defineComponent({
    name: 'OpenFileBar',
    components: {
      ContextActions
    },
    props: {
      resource: {
        type: Object,
        default: null
      }
    },
    setup() {
    const store = useStore()
    const getSpace = (resource: Resource): SpaceResource => {
      const storageId = resource.storageId
      // FIXME: Once we have the shareId in the OCS response, we can check for that and early return the share
      const space = store.getters['runtime/spaces/spaces'][0]
      if (space) {
        return space
      }
    }
    return {
      getSpace
    }
  },
  })
  </script>

  <style lang="scss">
  .open-file-bar {
    height: 52px;

    .open-file-bar-inner {
    height: 25px;
      align-items: center;
      justify-content: space-between;
      background-color: var(--oc-color-swatch-primary-default);
    width: 400px;
      border-top-left-radius: 15px;
      border-top-right-radius: 15px;

      .oc-resource {
        max-width: 90% !important;
      }

      .open-file-bar-resource button:hover {
        cursor: default;
      }

    #open-file-bar-resource svg {
      fill: var(--oc-color-swatch-inverse-default) !important;
    }

      .open-file-bar-resource-wrapper {
        flex-grow: 4;
        max-width: 80%;
      }

      .oc-resource-name span {
      color: var(--oc-color-swatch-inverse-default) !important;

        .oc-text-truncate {
          overflow: hidden;
        }
      }
      .oc-resource-name:hover {
        text-decoration: none;
      }
    }
  }
  </style>
