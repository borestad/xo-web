import angular from 'angular'
import uiRouter from 'angular-ui-router'

import _assign from 'lodash.assign'
import ansiUp from 'ansi_up'
import updater from '../../updater'
import xoApi from 'xo-api'
import xoServices from 'xo-services'
import {AuthenticationFailed} from '../../updater'

import view from './view'

export default angular.module('settings.update', [
  uiRouter,

  updater,
  xoApi,
  xoServices
])
  .config(function ($stateProvider) {
    $stateProvider.state('settings.update', {
      controller: 'SettingsUpdate as ctrl',
      url: '/update',
      onExit: updater => {
        updater.removeAllListeners('end')
      },
      template: view
    })
  })
  .filter('ansitohtml', function ($sce) {
    return function (input) {
      return $sce.trustAsHtml(ansiUp.ansi_to_html(input))
    }
  })
  .controller('SettingsUpdate', function (xoApi, xo, updater, notify) {
    this.updater = updater

    this.updater.isRegistered()
    .then(() => this.updater.on('end', () => {
      if (this.updater.state === 'registerNeeded' && this.updater.registerState !== 'unregistered' && this.updater.registerState !== 'error') {
        this.updater.isRegistered()
      }
    }))
    .catch(err => console.error(err))

    this.updater.getConfiguration()
    .then(configuration => this.configuration = _assign({}, configuration))
    .catch(error => notify.error({
      title: 'XOA Updater',
      message: error.message
    }))

    this.registerXoa = (email, password) => {
      this.regPwd = ''
      this.updater.register(email, password)
      .then(() => this.updater.update())
      .catch(AuthenticationFailed, () => {})
      .catch(() => {})
    }

    this.update = () => {
      this.updater.update()
      .catch(error => notify.error({
        title: 'XOA Updater',
        message: error.message
      }))
    }

    this.upgrade = () => {
      this.updater.upgrade()
      .catch(error => notify.error({
        title: 'XOA Updater',
        message: error.message
      }))
    }

    this.configure = (host, port) => {
      const config = {}
      config.proxyHost = host && host.trim() || null
      config.proxyPort = port && port.trim() || null
      return this.updater.configure(config)
      .then(configuration => this.configuration = _assign({}, configuration))
      .catch(error => notify.error({
        title: 'XOA Updater',
        message: error.message
      }))
      .finally(() => this.update())
    }

    this.valid = trial => {
      return trial && trial.end && Date.now() < trial.end
    }
  })
  .name
