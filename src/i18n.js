// Interface text in English and Arabic.

export const LANGUAGES = [
  { id: 'en', label: 'English', dir: 'ltr' },
  { id: 'ar', label: 'العربية', dir: 'rtl' },
];

export const STRINGS = {
  en: {
    appName: 'City Pulse',
    displaySettings: 'Display settings',
    orbit: 'Orbit · {platform}',
    upcoming: 'This screen is being rebuilt.',
    nav: {
      explore: 'Explore',
      compare: 'Compare',
      'pulse-ai': 'Pulse AI',
      insights: 'Insights',
      data: 'Data',
    },

    compareEyebrow: 'Epoch Telemetry Split',
    baselineEpoch: 'Baseline Epoch',
    targetEpoch: 'Target Epoch',
    selectBaselineEpoch: 'Select Baseline Epoch',
    selectTargetEpoch: 'Select Target Epoch',
    epochNames: {
      2013: 'Baseline',
      2015: 'Expansion',
      2020: 'Green Riyadh',
      2025: 'Present',
    },
    done: 'Done',
    active: 'Active',

    layers: {
      'true-radiance': 'True Radiance',
      'thermal-ir': 'Thermal IR',
      ndvi: 'NDVI',
    },
    scales: {
      ariaLabel: 'Map colour scale',
      ndviDistribution: 'NDVI Index Distribution',
      barren: 'Barren',
      soil: 'Soil',
      sparse: 'Sparse',
      denseCanopy: 'Dense Canopy',
      cooler: 'Cooler',
      hotter: 'Hotter',
    },
    nadirLock: 'Nadir Lock',
    dividerLabel: 'Comparison divider position',
    imageryError: 'Could not load NASA imagery for the selected years.',
    osmCredit: 'Labels © OpenStreetMap',
    compass: { north: 'N', south: 'S', east: 'E', west: 'W' },
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],

    deltaReadout: 'Differential Delta Readout',
    comparisonError: 'Could not load NASA MODIS data from ORNL DAAC. Check the connection and try again.',
    from: 'from',
    loadingData: 'Loading NASA MODIS data…',
    overpassNote:
      'Satellite overpass moved from {from} ({fromYear}) to {to} ({toYear}) local solar time; part of the temperature change comes from this.',
    landCoverYearNote: 'land cover {year} (latest available) used for {target}',
    analysisBox: '{size} × {size} km box',
    dataSources: {
      'true-radiance': 'NASA MODIS · MYD11A2 Jul–Aug · MOD13Q1 Feb–Apr · MCD12Q1 · ORNL DAAC',
      'thermal-ir': 'NASA MODIS · MYD11A2 Jul–Aug mean · MCD12Q1 urban mask · ORNL DAAC',
      ndvi: 'NASA MODIS · MOD13Q1 Feb–Apr mean · ORNL DAAC',
    },
    metrics: {
      surfaceHeat: 'Surf Heat',
      vegetation: 'NDVI Bio',
      urbanization: 'Built-Up',
      surfaceTemp: 'Surface Temp',
      diurnalCooling: 'Night Cooling',
      heatIsland: 'Heat Island',
      ndviIndex: 'NDVI Index',
      greenCover: 'Green Cover',
      aridShift: 'Arid Shift',
    },
    captions: {
      vsYear: "vs '{shortYear}",
      netSurge: 'NDVI ≥ 0.15',
      coolingDelta: 'day − night',
      vsRural: 'vs rural',
      bareGround: { highlight: 'Bare', rest: 'NDVI < 0.1' },
    },

    settings: {
      title: 'Settings',
      subtitle: 'Telemetry Display & Sensors',
      close: 'Close settings',
      overlayLabels: 'Show Overlay Labels',
      overlayLabelsHint: 'Coordinates, place names & roads',
      heatOpacity: 'Heat Map Opacity',
      heatOpacityHint: 'Satellite sensor blend intensity',
      temperatureUnit: 'Temperature Unit',
      temperatureUnitHint: 'Sensor telemetry unit',
      language: 'Interface Language',
      languageHint: 'Regional viewport localization',
      apply: 'Apply Settings',
    },
  },

  ar: {
    appName: 'City Pulse',
    displaySettings: 'إعدادات العرض',
    orbit: 'المدار · {platform}',
    upcoming: 'هذه الشاشة قيد البناء.',
    nav: {
      explore: 'استكشاف',
      compare: 'مقارنة',
      'pulse-ai': 'Pulse AI',
      insights: 'رؤى',
      data: 'البيانات',
    },

    compareEyebrow: 'مقارنة الحقب الزمنية',
    baselineEpoch: 'حقبة الأساس',
    targetEpoch: 'الحقبة المستهدفة',
    selectBaselineEpoch: 'اختر حقبة الأساس',
    selectTargetEpoch: 'اختر الحقبة المستهدفة',
    epochNames: {
      2013: 'خط الأساس',
      2015: 'التوسع',
      2020: 'الرياض الخضراء',
      2025: 'الحاضر',
    },
    done: 'تم',
    active: 'نشط',

    layers: {
      'true-radiance': 'الألوان الحقيقية',
      'thermal-ir': 'الحرارة',
      ndvi: 'NDVI',
    },
    scales: {
      ariaLabel: 'مقياس ألوان الخريطة',
      ndviDistribution: 'توزيع مؤشر NDVI',
      barren: 'جرداء',
      soil: 'تربة',
      sparse: 'متناثر',
      denseCanopy: 'غطاء كثيف',
      cooler: 'أبرد',
      hotter: 'أحرّ',
    },
    nadirLock: 'إعادة التمركز',
    dividerLabel: 'موضع خط المقارنة',
    imageryError: 'تعذّر تحميل صور ناسا للسنوات المختارة.',
    osmCredit: 'التسميات © OpenStreetMap',
    compass: { north: 'ش', south: 'ج', east: 'ق', west: 'غ' },
    months: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],

    deltaReadout: 'قراءة الفروقات',
    comparisonError: 'تعذّر تحميل بيانات ناسا MODIS من ORNL DAAC. تحقّق من الاتصال وحاول مجددًا.',
    from: 'من',
    loadingData: 'جارٍ تحميل بيانات ناسا MODIS…',
    overpassNote:
      'تغيّر وقت مرور القمر من {from} ({fromYear}) إلى {to} ({toYear}) بالتوقيت الشمسي المحلي، وجزء من تغيّر الحرارة سببه هذا.',
    landCoverYearNote: 'استُخدم الغطاء الأرضي لعام {year} (أحدث المتاح) لعام {target}',
    analysisBox: 'مربع {size} × {size} كم',
    dataSources: {
      'true-radiance': 'ناسا MODIS · MYD11A2 يوليو–أغسطس · MOD13Q1 فبراير–أبريل · MCD12Q1 · ORNL DAAC',
      'thermal-ir': 'ناسا MODIS · متوسط MYD11A2 يوليو–أغسطس · قناع العمران MCD12Q1 · ORNL DAAC',
      ndvi: 'ناسا MODIS · متوسط MOD13Q1 فبراير–أبريل · ORNL DAAC',
    },
    metrics: {
      surfaceHeat: 'حرارة السطح',
      vegetation: 'الغطاء النباتي',
      urbanization: 'العمران',
      surfaceTemp: 'حرارة السطح',
      diurnalCooling: 'التبريد الليلي',
      heatIsland: 'الجزيرة الحرارية',
      ndviIndex: 'مؤشر NDVI',
      greenCover: 'المساحة الخضراء',
      aridShift: 'تحوّل الجفاف',
    },
    captions: {
      vsYear: 'مقابل {year}',
      netSurge: 'NDVI ≥ 0.15',
      coolingDelta: 'النهار − الليل',
      vsRural: 'مقارنة بالضواحي',
      bareGround: { highlight: 'أرض جرداء', rest: 'NDVI < 0.1' },
    },

    settings: {
      title: 'الإعدادات',
      subtitle: 'العرض والمستشعرات',
      close: 'إغلاق الإعدادات',
      overlayLabels: 'إظهار التسميات',
      overlayLabelsHint: 'الإحداثيات وأسماء الأماكن والطرق',
      heatOpacity: 'شفافية خريطة الحرارة',
      heatOpacityHint: 'نسبة دمج طبقة الحرارة مع صورة القمر الصناعي',
      temperatureUnit: 'وحدة الحرارة',
      temperatureUnitHint: 'وحدة قراءات المستشعر',
      language: 'لغة الواجهة',
      languageHint: 'لغة الواجهة واتجاهها',
      apply: 'تطبيق الإعدادات',
    },
  },
};

// fillTemplate('Orbit · {platform}', { platform: 'Aqua' }) → 'Orbit · Aqua'
export function fillTemplate(template, values) {
  return template.replace(/\{(\w+)\}/g, (_, name) => values[name] ?? '');
}
