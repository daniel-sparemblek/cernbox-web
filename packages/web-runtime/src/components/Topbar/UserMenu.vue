<template>
  <nav v-if="userId" :aria-label="$gettext('Account menu')">
    <oc-button
      id="_userMenuButton"
      ref="menuButton"
      class="oc-topbar-personal"
      appearance="raw"
      :aria-label="$gettext('User Menu')"
    >
      <avatar-image
        class="oc-topbar-personal-avatar oc-flex-inline oc-flex-center oc-flex-middle"
        :width="32"
        :userid="userId"
        :user-name="user.displayname"
      />
    </oc-button>
    <oc-drop
      ref="menu"
      drop-id="account-info-container"
      toggle="#_userMenuButton"
      mode="click"
      close-on-click
      padding-size="small"
    >
      <oc-list class="user-menu-list">
        <li>
          <oc-button
            id="oc-topbar-account-manage"
            type="router-link"
            :to="{ path: '/account' }"
            appearance="raw"
          >
            <avatar-image :width="32" :userid="userId" :user-name="user.displayname" />
            <span class="profile-info-wrapper" :class="{ 'oc-py-xs': !user.email }">
              <span v-text="user.displayname" />
              <br v-if="user.email" />
              <span v-if="user.email" class="oc-text-small" v-text="user.email" />
            </span>
          </oc-button>
        </li>
        <li v-for="(app, index) in applicationsList" :key="`user-menu-${index}`">
          <oc-button v-if="app.url" type="a" appearance="raw" :target="app.target" :href="app.url">
            <oc-icon :name="app.icon" class="oc-p-xs" />
            <span v-text="$gettext(app.title)" />
          </oc-button>
          <oc-button v-else type="router-link" appearance="raw" :to="{ path: app.path }">
            <oc-icon :name="app.icon" class="oc-p-xs" />
            <span v-text="$gettext(app.title)" />
          </oc-button>
        </li>
        <li>
          <oc-button id="oc-topbar-account-logout" appearance="raw" @click="logout">
            <oc-icon name="logout-box-r" fill-type="line" class="oc-p-xs" />
            <span v-text="$gettext('Log out')" />
          </oc-button>
        </li>
        <li v-if="quotaEnabled" class="storage-wrapper oc-pl-s">
          <oc-icon name="cloud" fill-type="line" class="oc-p-xs" />
          <div class="storage-wrapper-text">
            <p class="oc-my-rm">
              <span v-text="personalStorageLabel" />
              <br />
              <span class="oc-text-small" v-text="personalStorageDetailsLabel" />
            </p>
            <oc-progress
              v-if="limitedPersonalStorage"
              :value="quotaUsagePercent"
              :max="100"
              size="small"
              :variation="quotaProgressVariant"
            />
          </div>
        </li>
      </oc-list>
    </oc-drop>
  </nav>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { mapGetters, mapState } from 'vuex'
import filesize from 'filesize'
import isNil from 'lodash-es/isNil'
import { authService } from '../../services/auth'
import { useCapabilitySpacesEnabled } from 'web-pkg/src/composables'

export default defineComponent({
  props: {
    applicationsList: {
      type: Array as PropType<any>,
      required: false,
      default: () => []
    }
  },
  setup() {
    return {
      hasSpaces: useCapabilitySpacesEnabled()
    }
  },
  computed: {
    ...mapGetters(['quota', 'user']),
    ...mapGetters({ legacyQuota: 'quota' }),
    ...mapState('runtime/spaces', ['spaces']),

    quota() {
      return this.hasSpaces
        ? this.spaces.find((s) => s.driveType === 'personal')?.spaceQuota
        : this.legacyQuota
    },
    useLegacyQuota() {
      return !this.hasSpaces
    },

    userId() {
      return this.user.username || this.user.id
    },
    personalStorageLabel() {
      if (!this.limitedPersonalStorage) {
        return this.$gettext('Personal storage')
      }
      return this.$gettextInterpolate(this.$gettext('Personal storage (%{percentage}% used)'), {
        percentage: this.quotaUsagePercent || 0
      })
    },
    personalStorageDetailsLabel() {
      const total = this.quota.definition === 'none' ? 0 : this.quota.total || 0
      const used = this.quota.used || 0
      return this.$gettextInterpolate(
        total ? this.$gettext('%{used} of %{total} used') : this.$gettext('%{used} used'),
        {
          used: filesize(used),
          total: filesize(total)
        }
      )
    },
    limitedPersonalStorage() {
      if (!this.useLegacyQuota) {
        return this.quota.total !== 0
      }

      return !isNil(this.quota.relative) && this.quota.definition !== 'none'
    },
    quotaEnabled() {
      return !!this.quota
    },
    quotaUsagePercent() {
      return this.useLegacyQuota
        ? parseFloat(this.quota.relative).toFixed(2)
        : parseFloat(((this.quota.used / this.quota.total) * 100).toFixed(2))
    },

    quotaProgressVariant() {
      if ((this.quotaUsagePercent || 0) < 80) {
        return 'primary'
      }
      if ((this.quotaUsagePercent || 0) < 90) {
        return 'warning'
      }
      return 'danger'
    }
  },
  mounted() {
    this.$refs.menu?.tippy?.setProps({
      onHidden: () => this.$refs.menuButton.$el.focus(),
      onShown: () => this.$refs.menu.$el.querySelector('a:first-of-type').focus()
    })
  },
  methods: {
    logout() {
      authService.logoutUser()
    }
  }
})
</script>

<style lang="scss" scoped>
.user-menu-list li {
  align-items: center;
  display: flex;
  margin: var(--oc-space-xsmall) 0;

  a,
  button {
    gap: var(--oc-space-medium);
    justify-content: flex-start;
    min-height: 3rem;
    padding-left: var(--oc-space-small);
    width: 100%;

    &:focus,
    &:hover {
      background-color: var(--oc-color-background-hover);
      color: var(--oc-color-swatch-passive-default);
      text-decoration: none;
    }

    .profile-info-wrapper {
      text-align: left;
      word-break: break-all;
    }
  }

  &.storage-wrapper {
    gap: var(--oc-space-medium);
    min-height: 3rem;

    .storage-wrapper-text {
      align-self: flex-end;
      display: inline-block;
    }
  }
}
</style>
