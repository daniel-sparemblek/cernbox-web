import get from 'lodash-es/get'
import kebabCase from 'lodash-es/kebabCase'
import { mapGetters, mapState } from 'vuex'
import { Resource } from 'web-client'
import { SpaceResource } from 'web-client/src/helpers'
import { ShareStatus } from 'web-client/src/helpers/share'
import { routeToContextQuery } from 'web-pkg/src/composables/appDefaults'
import { configurationManager } from 'web-pkg/src/configuration'

import { isLocationSharesActive, isLocationTrashActive } from '../router'
import AcceptShare from './actions/acceptShare'
import Copy from './actions/copy'
import DeclineShare from './actions/declineShare'
import Delete from './actions/delete'
import DownloadArchive from './actions/downloadArchive'
import DownloadFile from './actions/downloadFile'
import Favorite from './actions/favorite'
import Move from './actions/move'
import ShowEditTags from './actions/showEditTags'
import Navigate from './actions/navigate'
import Rename from './actions/rename'
import Restore from './actions/restore'
import isSearchActive from './helpers/isSearchActive'

const actionsMixins = [
  'navigate',
  'downloadArchive',
  'downloadFile',
  'favorite',
  'copy',
  'move',
  'rename',
  'showEditTags',
  'restore',
  'delete',
  'acceptShare',
  'declineShare'
]

export const EDITOR_MODE_EDIT = 'edit'
export const EDITOR_MODE_CREATE = 'create'

export type FileActionOptions = {
  space: SpaceResource
  resources: Resource[]
  sameTab?: Boolean
}

export default {
  mixins: [
    AcceptShare,
    Copy,
    DeclineShare,
    Delete,
    DownloadFile,
    DownloadArchive,
    Favorite,
    Move,
    Navigate,
    Rename,
    Restore,
    isSearchActive,
    ShowEditTags
  ],
  computed: {
    ...mapState(['apps']),
    ...mapGetters('Files', ['currentFolder']),
    ...mapGetters(['capabilities', 'configuration']),

    $_fileActions_systemActions() {
      return actionsMixins.flatMap((actionMixin) => {
        return this[`$_${actionMixin}_items`]
      })
    },

    $_fileActions_editorActions() {
      return this.apps.fileEditors
        .map((editor) => {
          return {
            label: () => {
              if (editor.label) {
                return this.$gettext(editor.label)
              }
              const translated = this.$gettext('Open in %{app}')
              return this.$gettextInterpolate(
                translated,
                { app: this.apps.meta[editor.app].name },
                true
              )
            },
            icon: this.apps.meta[editor.app].icon,
            ...(this.apps.meta[editor.app].iconFillType && {
              iconFillType: this.apps.meta[editor.app].iconFillType
            }),
            img: this.apps.meta[editor.app].img,
            handler: (options: FileActionOptions) =>
              this.$_fileActions_openEditor(
                editor,
                options.space.getDriveAliasAndItem(options.resources[0]),
                options.resources[0].webDavPath,
                options.resources[0].fileId,
                EDITOR_MODE_EDIT,
                options.space.shareId,
                options.sameTab
              ),
            isEnabled: ({ resources }) => {
              if (resources.length !== 1) {
                return false
              }

              if (
                !this.$_isSearchActive &&
                (isLocationTrashActive(this.$router, 'files-trash-generic') ||
                  (isLocationSharesActive(this.$router, 'files-shares-with-me') &&
                    resources[0].status === ShareStatus.declined))
              ) {
                return false
              }

              if (resources[0].extension && editor.extension) {
                return resources[0].extension.toLowerCase() === editor.extension.toLowerCase()
              }

              if (resources[0].mimeType && editor.mimeType) {
                return (
                  resources[0].mimeType.toLowerCase() === editor.mimeType.toLowerCase() ||
                  resources[0].mimeType.split('/')[0].toLowerCase() ===
                    editor.mimeType.toLowerCase()
                )
              }

              return false
            },
            canBeDefault: editor.canBeDefault,
            componentType: 'button',
            class: `oc-files-actions-${kebabCase(
              this.apps.meta[editor.app].name
            ).toLowerCase()}-trigger`
          }
        })
        .sort((first, second) => {
          // Ensure default are listed first
          if (second.canBeDefault !== first.canBeDefault && second.canBeDefault) {
            return 1
          }
          return 0
        })
    }
  },

  methods: {
    $_fileActions_openEditor(editor, driveAliasAndItem: string, filePath, fileId, mode, shareId, sameTab) {
      if (editor.handler) {
        return editor.handler({
          config: this.configuration,
          extensionConfig: editor.config,
          driveAliasAndItem,
          filePath,
          fileId,
          mode,
          ...(shareId && { shareId })
        })
      }

      const routeOpts = this.$_fileActions__routeOpts(
        editor,
        driveAliasAndItem,
        filePath,
        fileId,
        mode,
        shareId
      )

      if (this.configuration.options.openAppsInTab  && !sameTab) {
        const path = this.$router.resolve(routeOpts).href
        const target = `${editor.routeName}-${filePath}`
        const win = window.open(path, target)
        // in case popup is blocked win will be null
        if (win) {
          win.focus()
        } else {      
            this.showMessage({
              title: this.$gettext('Blocked pop-ups and redirects'),
              timeout: 10,
              status: 'warning',
              desc: this.$gettext('Some features might not work correctly. Please enable pop-ups and redirects in Settings > Privacy & Security > Site Settings > Permissions')
            })       
        }
        return
      }

      this.$router.push(routeOpts)
    },

    $_fileActions__routeOpts(app, driveAliasAndItem: string, filePath, fileId, mode, shareId) {
      return {
        name: app.routeName || app.app,
        params: {
          driveAliasAndItem,
          filePath,
          fileId,
          mode
        },
        query: {
          ...(shareId && { shareId }),
          ...(fileId && configurationManager.options.routing.idBased && { fileId }),
          ...routeToContextQuery(this.$route)
        }
      }
    },

    // TODO: Make user-configurable what is a defaultAction for a filetype/mimetype
    // returns the _first_ action from actions array which we now construct from
    // available mime-types coming from the app-provider and existing actions
    $_fileActions_triggerDefaultAction(options: FileActionOptions) {
      const action = this.$_fileActions_getDefaultAction(options)
      action.handler({ ...options, ...action.handlerData })
    },

    $_fileActions_getDefaultAction(options: FileActionOptions) {
      const filterCallback = (action) =>
        action.canBeDefault &&
        action.isEnabled({
          ...options,
          parent: this.currentFolder
        })

      // first priority: handlers from config
      const defaultEditorActions = this.$_fileActions_editorActions.filter(filterCallback)
      if (defaultEditorActions.length) {
        return defaultEditorActions[0]
      }

      // second priority: `/app/open` endpoint of app provider if available
      // FIXME: files app should not know anything about the `external apps` app
      const externalAppsActions =
        this.$_fileActions_loadExternalAppActions(options).filter(filterCallback)
      if (externalAppsActions.length) {
        return externalAppsActions[0]
      }

      // fallback: system actions
      return this.$_fileActions_systemActions.filter(filterCallback)[0]
    },

    $_fileActions_getAllAvailableActions(options: FileActionOptions) {
      return [
        ...this.$_fileActions_editorActions,
        ...this.$_fileActions_loadExternalAppActions(options),
        ...this.$_fileActions_systemActions
      ].filter((action) => {
        return action.isEnabled(options)
      })
    },

    // returns an array of available external Apps
    // to open a resource with a specific mimeType
    // FIXME: filesApp should not know anything about any other app, dont cross the line!!! BAD
    $_fileActions_loadExternalAppActions(options: FileActionOptions) {
      if (isLocationTrashActive(this.$router, 'files-trash-generic')) {
        return []
      }

      // we don't support external apps as batch action as of now
      if (options.resources.length !== 1) {
        return []
      }

      const resource = options.resources[0]
      const { mimeType, webDavPath, fileId } = resource
      const driveAliasAndItem = options.space.getDriveAliasAndItem(resource)
      const mimeTypes = this.$store.getters['External/mimeTypes'] || []
      if (
        mimeType === undefined ||
        !get(this, 'capabilities.files.app_providers') ||
        !mimeTypes.length
      ) {
        return []
      }

      const filteredMimeTypes = mimeTypes.find((t) => t.mime_type === mimeType)
      if (filteredMimeTypes === undefined) {
        return []
      }
      const { app_providers: appProviders = [], default_application: defaultApplication } =
        filteredMimeTypes

      return appProviders.map((app) => {
        const label = this.$gettext('Open in %{ appName }')
        return {
          name: app.name,
          icon: app.icon,
          img: app.img,
          componentType: 'button',
          class: `oc-files-actions-${app.name}-trigger`,
          isEnabled: () => true,
          canBeDefault: defaultApplication === app.name,
          handler: () =>
            this.$_fileActions_openExternalApp(
              app.name,
              driveAliasAndItem,
              webDavPath,
              fileId,
              options.space.shareId,
              options.sameTab
            ),
          label: () => this.$gettextInterpolate(label, { appName: app.name })
        }
      })
    },

    $_fileActions_openExternalApp(app, driveAliasAndItem: string, filePath, fileId, shareId, sameTab=false) {
      const routeOpts = this.$_fileActions__routeOpts(
        {
          routeName: 'external-apps'
        },
        driveAliasAndItem,
        filePath,
        undefined,
        undefined,
        shareId
      )

      routeOpts.query = {
        app,
        fileId,
        ...routeOpts.query
      }

      // TODO: Let users configure whether to open in same/new tab (`_blank` vs `_self`)
      const win =  window.open(this.$router.resolve(routeOpts).href, sameTab ? '_self' : '_blank')

      if (!win) {   
          this.showMessage({
            title: this.$gettext('Blocked pop-ups and redirects'),
            timeout: 10,
            status: 'warning',
            desc: this.$gettext('Some features might not work correctly. Please enable pop-ups and redirects in Settings > Privacy & Security > Site Settings > Permissions')
          })       
      }
    }
  }
}
