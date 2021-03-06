import angular from 'angular'

import view from './view'

// =====================================================================

export default angular.module('xoWebApp.isoDevice', [])

  .directive('isoDevice', () => ({
    restrict: 'E',
    template: view,
    scope: {
      srs: '=',
      vm: '='
    },
    controller: 'IsoDevice as isoDevice',
    bindToController: true
  }))

  .controller('IsoDevice', function ($scope, xo, xoApi) {
    const {get} = xoApi
    const descriptor = obj => obj.name_label + (obj.name_description.length ? (' - ' + obj.name_description) : '')

    this.eject = VM => xo.vm.ejectCd(VM.id)
    this.insert = (VM, disc_id) => xo.vm.insertCd(VM.id, disc_id, true)

    const prepareDiskData = (srs, vbds) => {
      const ISOOpts = []
      for (let key in srs) {
        const SR = srs[key]
        if (SR.SR_type === 'iso') {
          for (let key in SR.VDIs) {
            const rIso = SR.VDIs[key]
            const oIso = get(rIso)
            ISOOpts.push({
              sr: SR.name_label,
              label: descriptor(oIso),
              iso: oIso
            })
          }
        }
      }
      let mounted = ''
      for (let key in vbds) {
        const VBD = vbds[key]
        const oVbd = get(VBD)
        if (oVbd && oVbd.is_cd_drive) {
          const oVdi = get(oVbd.VDI)
          oVdi && (mounted = oVdi.id)
        }
      }
      return {
        opts: ISOOpts,
        mounted
      }
    }

    $scope.$watchCollection(() => this.srs, srs => this.isos = prepareDiskData(srs, this.vm.$VBDs))
    $scope.$watch(() => this.vm && this.vm.$VBDs, vbds => this.isos = prepareDiskData(this.srs, vbds))
  })

  // A module exports its name.
  .name
