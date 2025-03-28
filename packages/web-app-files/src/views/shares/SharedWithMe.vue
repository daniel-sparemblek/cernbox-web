<template>
  <div class="oc-flex">
    <files-view-wrapper class="oc-flex-column">
      <app-bar
        :has-shares-navigation="!user.isLightweight"
        :has-bulk-actions="true"
        :side-bar-open="sideBarOpen"
      />
      <app-loading-spinner v-if="areResourcesLoading" />
      <template v-else>
        <h2 class="oc-px-m oc-py-s" style="margin-top: 0">
          {{ showHiddenShares ? declinedTitle : acceptedTitle }}
          <span class="oc-text-medium"
            >({{ showHiddenShares ? declinedItems.length : acceptedItems.length }})</span
          >
          <oc-button
            id="files-shared-with-me-toggle-view-mode"
            class="oc-ml-m"
            @click.stop="switchHiddenShares"
          >
            {{ switchHiddenSharesLabel }}
          </oc-button>
        </h2>
        <!--
        <shared-with-me-section
          v-if="pendingItems.length > 0"
          id="files-shared-with-me-pending-section"
          :display-thumbnails="false"
          :file-list-header-y="fileListHeaderY"
          :items="pendingItems"
          :resource-clickable="false"
          :share-status="ShareStatus.pending"
          :show-more-toggle="true"
          :side-bar-open="sideBarOpen"
          :sort-by="pendingSortBy"
          :sort-dir="pendingSortDir"
          :sort-handler="pendingHandleSort"
          :title="pendingTitle"
        />
        -->
        <shared-with-me-section
          v-if="!showHiddenShares"
          id="files-shared-with-me-accepted-section"
          :display-thumbnails="displayThumbnails"
          :empty-message="acceptedEmptyMessage"
          :file-list-header-y="fileListHeaderY"
          :items="acceptedItems"
          :resource-clickable="true"
          :share-status="ShareStatus.accepted"
          :side-bar-open="sideBarOpen"
          :sort-by="acceptedSortBy"
          :sort-dir="acceptedSortDir"
          :sort-handler="acceptedHandleSort"
          :title="acceptedTitle"
          :grouping-settings="groupingSettings"
        />

        <shared-with-me-section
          v-else
          id="files-shared-with-me-declined-section"
          :display-thumbnails="false"
          :empty-message="declinedEmptyMessage"
          :file-list-header-y="fileListHeaderY"
          :items="declinedItems"
          :resource-clickable="false"
          :share-status="ShareStatus.declined"
          :show-more-toggle="true"
          :side-bar-open="sideBarOpen"
          :sort-by="declinedSortBy"
          :sort-dir="declinedSortDir"
          :sort-handler="declinedHandleSort"
          :title="declinedTitle"
          :grouping-settings="groupingSettings"
        />
      </template>
    </files-view-wrapper>
    <side-bar :open="sideBarOpen" :active-panel="sideBarActivePanel" :space="selectedShareSpace" />
  </div>
</template>

<script lang="ts">
import { mapGetters } from 'vuex'
import { useSort, useResourcesViewDefaults } from '../../composables'

import AppLoadingSpinner from 'web-pkg/src/components/AppLoadingSpinner.vue'
import AppBar from '../../components/AppBar/AppBar.vue'
import SharedWithMeSection from '../../components/Shares/SharedWithMeSection.vue'
import { ShareStatus } from 'web-client/src/helpers/share'
import { computed, defineComponent, unref } from 'vue'
import { Resource } from 'web-client'
import SideBar from '../../components/SideBar/SideBar.vue'
import FilesViewWrapper from '../../components/FilesViewWrapper.vue'
import { buildShareSpaceResource } from 'web-client/src/helpers'
import { configurationManager } from 'web-pkg/src/configuration'
import { useCapabilityShareJailEnabled, useStore } from 'web-pkg/src/composables'

export default defineComponent({
  components: {
    FilesViewWrapper,
    AppBar,
    AppLoadingSpinner,
    SharedWithMeSection,
    SideBar
  },

  setup() {
    const {
      areResourcesLoading,
      sortFields,
      fileListHeaderY,
      loadResourcesTask,
      selectedResources,
      selectedResourcesIds,
      sideBarActivePanel,
      sideBarOpen,
      storeItems,
      scrollToResourceFromRoute
    } = useResourcesViewDefaults<Resource, any, any[]>()

    // pending shares
    const pending = computed(() => [])
    const {
      sortBy: pendingSortBy,
      sortDir: pendingSortDir,
      items: pendingItems,
      handleSort: pendingHandleSort
    } = useSort({
      items: pending,
      fields: sortFields,
      sortByQueryName: 'pending-sort-by',
      sortDirQueryName: 'pending-sort-dir'
    })

    // accepted shares
    const accepted = computed(() =>
      unref(storeItems).filter(
        (item) => item.status !== ShareStatus.declined
      )
    )
    const {
      sortBy: acceptedSortBy,
      sortDir: acceptedSortDir,
      items: acceptedItems,
      handleSort: acceptedHandleSort
    } = useSort({
      items: accepted,
      fields: sortFields,
      sortByQueryName: 'accepted-sort-by',
      sortDirQueryName: 'accepted-sort-dir'
    })

    // declined shares
    const declined = computed(() =>
      unref(storeItems).filter((item) => item.status === ShareStatus.declined)
    )
    const {
      sortBy: declinedSortBy,
      sortDir: declinedSortDir,
      items: declinedItems,
      handleSort: declinedHandleSort
    } = useSort({
      items: declined,
      fields: sortFields,
      sortByQueryName: 'declined-sort-by',
      sortDirQueryName: 'declined-sort-dir'
    })

    const store = useStore()
    const hasShareJail = useCapabilityShareJailEnabled()
    const selectedShareSpace = computed(() => {
      if (unref(selectedResources).length !== 1) {
        return null
      }
      const resource = unref(selectedResources)[0]
      if (!unref(hasShareJail)) {
        return store.getters['runtime/spaces/spaces'].find(
          (space) => space.driveType === 'personal'
        )
      }

      return buildShareSpaceResource({
        shareId: resource.shareId,
        shareName: resource.name,
        serverUrl: configurationManager.serverUrl
      })
    })

    return {
      // defaults
      loadResourcesTask,
      areResourcesLoading,
      selectedResources,
      selectedResourcesIds,
      fileListHeaderY,
      sideBarOpen,
      sideBarActivePanel,
      selectedShareSpace,
      scrollToResourceFromRoute,

      // view specific
      pendingHandleSort,
      pendingSortBy,
      pendingSortDir,
      pendingItems,

      acceptedHandleSort,
      acceptedSortBy,
      acceptedSortDir,
      acceptedItems,

      declinedHandleSort,
      declinedSortBy,
      declinedSortDir,
      declinedItems
    }
  },

  data: () => ({
    ShareStatus,
    showHiddenShares: false
  }),

  computed: {
    ...mapGetters(['configuration']),
    ...mapGetters(['user']),

    groupingSettings() {
      const that = this
      return {
        groupingBy: localStorage.getItem('grouping-shared-with-me') || 'Shared on',
        showGroupingOptions: true,
        groupingFunctions: {
          'Name alphabetically': function (row) {
            localStorage.setItem('grouping-shared-with-me', 'Name alphabetically')
            if (!isNaN(row.name.charAt(0))) return '#'
            if (row.name.charAt(0) === '.') return row.name.charAt(1).toLowerCase()
            return row.name.charAt(0).toLowerCase()
          },
          'Shared on': function (row) {
            localStorage.setItem('grouping-shared-with-me', 'Shared on')
            const recently = Date.now() - 604800000
            const lastMonth = Date.now() - 2592000000
            if (Date.parse(row.sdate) < lastMonth) return 'Older'
            if (Date.parse(row.sdate) >= recently) return 'Recently'
            else return 'Last month'
          },
          'Share owner': function (row) {
            localStorage.setItem('grouping-shared-with-me', 'Share owner')
            return row.owner[0].displayName
          },
          None: function () {
            localStorage.setItem('grouping-shared-with-me', 'None')
          }
        },
        sortGroups: {
          'Name alphabetically': function (groups) {
            // sort in alphabetical order by group name
            const sortedGroups = groups.sort(function (a, b) {
              if (a.name < b.name) {
                return -1
              }
              if (a.name > b.name) {
                return 1
              }
              return 0
            })
            // if sorting is done by name, reverse groups depending on asc/desc
            if (that.sharesSortBy === 'name' && that.sharesSortDir === 'desc')
              sortedGroups.reverse()
            return sortedGroups
          },
          'Shared on': function (groups) {
            // sort in order: 1-Recently, 2-Last month, 3-Older
            const sortedGroups = []
            const options = ['Recently', 'Last month', 'Older']
            for (const o of options) {
              const found = groups.find((el) => el.name.toLowerCase() === o.toLowerCase())
              if (found) sortedGroups.push(found)
            }
            // if sorting is done by sdate, reverse groups depending on asc/desc
            if (that.sharesSortBy === 'sdate' && that.sharesSortDir === 'asc')
              sortedGroups.reverse()
            return sortedGroups
          },
          'Share owner': function (groups) {
            // sort in alphabetical order by group name
            const sortedGroups = groups.sort(function (a, b) {
              if (a.name < b.name) {
                return -1
              }
              if (a.name > b.name) {
                return 1
              }
              return 0
            })
            // if sorting is done by owner, reverse groups depending on asc/desc
            if (that.sharesSortBy === 'owner' && that.sharesSortDir === 'desc')
              sortedGroups.reverse()
            return sortedGroups
          }
        }
      }
    },

    switchHiddenSharesLabel() {
      return this.showHiddenShares
        ? this.$gettext('Show shares')
        : this.$gettext('Show hidden shares')
    },
    pendingTitle() {
      return this.$gettext('Pending shares')
    },

    acceptedTitle() {
      return this.$gettext('Shared with me')
    },
    acceptedEmptyMessage() {
      return this.$gettext("You are not collaborating on other people's resources.")
    },

    declinedTitle() {
      return this.$gettext('Hidden shares')
    },
    declinedEmptyMessage() {
      return this.$gettext("You don't have any previously declined shares.")
    },
    displayThumbnails() {
      return !this.configuration?.options?.disablePreviews
    }
  },

  async created() {
    await this.loadResourcesTask.perform()
    this.scrollToResourceFromRoute(this.acceptedItems)
  },

  methods: {
    switchHiddenShares() {
      this.showHiddenShares = !this.showHiddenShares
    }
  }
})
</script>
