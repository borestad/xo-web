import angular from 'angular'
import forEach from 'lodash.foreach'
import isEmpty from 'lodash.isempty'
import uiRouter from 'angular-ui-router'

import Bluebird from 'bluebird'

import view from './view'

// ===================================================================

export default angular.module('xoWebApp.sr', [
  uiRouter
])
  .config(function ($stateProvider) {
    $stateProvider.state('SRs_view', {
      url: '/srs/:id',
      controller: 'SrCtrl',
      template: view
    })
  })
  .controller('SrCtrl', function ($scope, $stateParams, $state, $q, notify, xoApi, xo, modal, $window, bytesToSizeFilter) {

    $window.bytesToSize = bytesToSizeFilter //  FIXME dirty workaround to custom a Chart.js tooltip template

    $scope.currentLogPage = 1
    $scope.currentVDIPage = 1

    let {get} = xoApi
    $scope.$watch(() => xoApi.get($stateParams.id), function (SR) {
      $scope.SR = SR
    })

    $scope.saveSR = function ($data) {
      let {SR} = $scope
      let {name_label, name_description} = $data

      $data = {
        id: SR.id
      }
      if (name_label !== SR.name_label) {
        $data.name_label = name_label
      }
      if (name_description !== SR.name_description) {
        $data.name_description = name_description
      }

      return xoApi.call('sr.set', $data)
    }

    $scope.deleteVDI = function (id) {
      console.log('Delete VDI', id)

      return modal.confirm({
        title: 'VDI deletion',
        message: 'Are you sure you want to delete this VDI? This operation is irreversible.'
      }).then(function () {
        return xo.vdi.delete(id)
      })
    }

    $scope.disconnectVBD = function (id) {
      console.log('Disconnect VBD', id)

      return xoApi.call('vbd.disconnect', {id: id})
    }

    $scope.connectPBD = function (id) {
      console.log('Connect PBD', id)

      return xoApi.call('pbd.connect', {id: id})
    }

    $scope.disconnectPBD = function (id) {
      console.log('Disconnect PBD', id)

      return xoApi.call('pbd.disconnect', {id: id})
    }

    $scope.reconnectAllHosts = function () {
      // TODO: return a Bluebird.all(promises).
      for (let id of $scope.SR.$PBDs) {
        let pbd = xoApi.get(id)

        xoApi.call('pbd.connect', {id: pbd.id})
      }
    }

    $scope.disconnectAllHosts = function () {
      return modal.confirm({
        title: 'Disconnect hosts',
        message: 'Are you sure you want to disconnect all hosts to this SR?'
      }).then(function () {
        for (let id of $scope.SR.$PBDs) {
          let pbd = xoApi.get(id)

          xoApi.call('pbd.disconnect', {id: pbd.id})
          console.log(pbd.id)
        }
      })
    }

    $scope.rescanSr = function (id) {
      console.log('Rescan SR', id)

      return xoApi.call('sr.scan', {id: id})
    }

    $scope.removeSR = function (id) {
      console.log('Remove SR', id)

      return modal.confirm({
        title: 'SR deletion',
        message: 'Are you sure you want to delete this SR? This operation is irreversible.'
      }).then(function () {
        return Bluebird.map($scope.SR.$PBDs, pbdId => {
          let pbd = xoApi.get(pbdId)

          return xoApi.call('pbd.disconnect', { id: pbd.id })
        })
      }).then(function () {
        return xoApi.call('sr.destroy', {id: id})
      }).then(function () {
        $state.go('index')
        notify.info({
          title: 'SR remove',
          message: 'SR is removed'
        })
      })
    }

    $scope.forgetSR = function (id) {
      console.log('Forget SR', id)

      return modal.confirm({
        title: 'SR forget',
        message: 'Are you sure you want to forget this SR? No VDI on this SR will be removed.'
      }).then(function () {
        return Bluebird.map($scope.SR.$PBDs, pbdId => {
          let pbd = xoApi.get(pbdId)

          return xoApi.call('pbd.disconnect', { id: pbd.id })
        })
      }).then(function () {
        return xoApi.call('sr.forget', {id: id})
      }).then(function () {
        $state.go('index')
        notify.info({
          title: 'SR forget',
          message: 'SR is forgotten'
        })
      })
    }

    $scope.saveDisks = function (data) {
      // Group data by disk.
      let disks = {}
      forEach(data, function (value, key) {
        let i = key.indexOf('/')

        let id = key.slice(0, i)
        let prop = key.slice(i + 1)

        ;(disks[id] || (disks[id] = {}))[prop] = value
      })

      let promises = []
      forEach(disks, function (attributes, id) {
        // Keep only changed attributes.
        let disk = get(id)

        forEach(attributes, function (value, name) {
          if (value === disk[name]) {
            delete attributes[name]
          }
        })

        if (!isEmpty(attributes)) {
          // Inject id.
          attributes.id = id

          // Ask the server to update the object.
          promises.push(xoApi.call('vdi.set', attributes))
        }
      })

      return $q.all(promises)
    }
  })

  // A module exports its name.
  .name
