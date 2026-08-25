<script>
  import { t } from './i18n'

  export let Hst
</script>

<Hst.Story title="i18n" layout={{ type: 'grid', width: 200 }}>
  <Hst.Variant title="English">
    {t('greeting', 'en')}
  </Hst.Variant>
  <Hst.Variant title="Français">
    {t('greeting', 'fr')}
  </Hst.Variant>
</Hst.Story>
