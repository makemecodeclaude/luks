/* LUKS Info-Terminal – configuration and content data (Standort Luzern)
 *
 * Map coordinates use the area plan image (assets/arealplan-luzern.jpg) in a 2000 × 777 coordinate space.
 * Grid columns A–R are ~111 units wide, rows 1–7 ~111 units high.
 *
 * Every entry flagged `verify: true` is an assumption (not shown on the official area plan) and must be
 * confirmed by LUKS before go-live. While CONFIG.showVerifyHints is true, those entries carry a small hint chip.
 */
(function () {
  'use strict';

  const GASTRO = 'https://www.luks.ch/standorte/standort-luzern/spitalaufenthalt/dienstleistungen-und-wissenswertes/gastronomie-am-standort-luzern';

  const CONFIG = {
    terminalId: 'T1 · Haus 31',
    defaultLang: 'de',
    // Position of this terminal on the area plan (2000 × 777). Default: main entrance A, Haus 31.
    terminalPos: { x: 1150, y: 418 },
    idleSeconds: 90,
    idleCountdown: 15,
    showVerifyHints: true,
    // Shows a small "simulate scan" button on the start page (also enabled with ?demo=1).
    demoScan: false,
    printTickets: true,
    ticketPrefix: 'A',
    help: {
      // URL of the video room for the information desk (e.g. a WebRTC / Teams kiosk link). Empty = demo screen.
      videoUrl: '',
      // Optional HTTP endpoint that is notified (POST JSON) when someone asks for help.
      notifyUrl: '',
      phoneNumber: '+41 41 205 11 11',
      volunteerEtaMin: 4,
    },
    gastroUrl: GASTRO,
  };

  const BUILDINGS = [
    { id: '31', grid: 'K/3', x: 1180, y: 232, name: { de: 'Spitalzentrum', fr: 'Centre hospitalier', it: 'Centro ospedaliero', en: 'Main hospital' } },
    { id: '33', grid: 'L/5', x: 1290, y: 482, name: { de: 'Kinderspital', fr: 'Hôpital pédiatrique', it: 'Ospedale pediatrico', en: "Children's hospital" } },
    { id: '30', grid: 'J/5', x: 1077, y: 500, name: { de: 'Augenklinik', fr: 'Clinique ophtalmologique', it: 'Clinica oftalmologica', en: 'Eye clinic' } },
    { id: '21', grid: 'H/4', x: 893, y: 432, name: { de: 'Frauenklinik', fr: 'Clinique gynécologique', it: 'Clinica ginecologica', en: "Women's clinic" } },
    { id: '34', grid: 'K/7', x: 1139, y: 620, name: { de: 'Parkhaus Besuchende', fr: 'Parking visiteurs', it: 'Autosilo visitatori', en: 'Visitor car park' } },
    { id: '42', grid: 'O/3', x: 1699, y: 252, name: { de: 'Parkhaus Mitarbeitende', fr: 'Parking du personnel', it: 'Autosilo personale', en: 'Staff car park' } },
    { id: '46', grid: 'O/6', x: 1631, y: 618, name: { de: 'XUND Bildungszentrum', fr: 'Centre de formation XUND', it: 'Centro di formazione XUND', en: 'XUND training centre' } },
    { id: '51', grid: 'J/4', x: 1024, y: 340, name: { de: 'Container MRT', fr: 'Conteneur IRM', it: 'Container RM', en: 'MRI container' } },
    { id: '11', grid: 'D/5', x: 326, y: 436, name: { de: 'lups – Luzerner Psychiatrie', fr: 'lups – Psychiatrie lucernoise', it: 'lups – Psichiatria lucernese', en: 'lups – Lucerne Psychiatry' } },
    { id: '15', grid: 'D/3', x: 397, y: 297, name: { de: 'Kapelle', fr: 'Chapelle', it: 'Cappella', en: 'Chapel' } },
    { id: '40', grid: 'N/6', x: 1517, y: 610, name: { de: 'Arztpraxis', fr: 'Cabinet médical', it: 'Studio medico', en: 'Medical practice' } },
    { id: '10', grid: 'F/4', x: 614, y: 480, name: { de: 'Haus 10', fr: 'Bâtiment 10', it: 'Edificio 10', en: 'Building 10' } },
    { id: '28', grid: 'I/3', x: 919, y: 282, name: { de: 'Haus 28', fr: 'Bâtiment 28', it: 'Edificio 28', en: 'Building 28' } },
  ];

  /* Map / facility categories. `services: true` = listed on the "Facilities" page (as requested). */
  const CATS = [
    { id: 'wc', icon: 'wc', services: true, kw: ['wc', 'toilette', 'toiletten', 'klo', 'toilet', 'restroom', 'bathroom', 'loo', 'toilettes', 'gabinetto', 'bagno', 'casa de banho', 'baño', 'aseo', 'aseos', 'tuvalet', 'tualet', 'tualeta'] },
    { id: 'wc_access', icon: 'wheelchair', services: true, kw: ['rollstuhl', 'rollstuhlgängig', 'behindert', 'barrierefrei', 'accessible', 'wheelchair', 'disabled', 'handicap', 'fauteuil roulant', 'sedia a rotelle', 'cadeira de rodas', 'silla de ruedas', 'engelli', 'karrocë'] },
    { id: 'baby', icon: 'baby', services: true, kw: ['wickeln', 'wickelraum', 'wickeltisch', 'baby', 'windel', 'baby changing', 'nappy', 'diaper', 'table à langer', 'langer', 'fasciatoio', 'pannolino', 'fraldário', 'cambiador', 'pañal', 'bebek', 'bez', 'foshnja'] },
    { id: 'pharmacy', icon: 'cross', services: true, kw: ['apotheke', 'medikament', 'medikamente', 'rezept', 'pharmacy', 'medicine', 'prescription', 'pharmacie', 'médicament', 'farmacia', 'medicina', 'farmácia', 'medicamento', 'eczane', 'ilaç', 'farmaci', 'barna'] },
    { id: 'kiosk', icon: 'kiosk', services: true, kw: ['kiosk', 'zeitung', 'zeitschrift', 'snack', 'blumen', 'geschenk', 'newspaper', 'shop', 'kiosque', 'journal', 'chiosco', 'giornale', 'quiosque', 'quiosco', 'büfe', 'gazete', 'kiosku'] },
    { id: 'atm', icon: 'atm', services: true, kw: ['bancomat', 'geldautomat', 'bargeld', 'geld', 'atm', 'cash machine', 'cash', 'money', 'argent', 'distributeur', 'soldi', 'contanti', 'multibanco', 'dinheiro', 'cajero', 'dinero', 'para', 'bankamatik', 'bankomat', 'para çekme', 'para'] },
    { id: 'cash', icon: 'card', services: true, kw: ['kasse', 'bezahlen', 'rechnung', 'zahlen', 'cash desk', 'pay', 'payment', 'bill', 'caisse', 'payer', 'facture', 'cassa', 'pagare', 'fattura', 'caixa', 'pagar', 'caja', 'vezne', 'ödeme', 'fatura', 'arka', 'pagesë'] },
    { id: 'lockers', icon: 'lock', services: true, kw: ['schliessfach', 'schliessfächer', 'gepäck', 'koffer', 'locker', 'lockers', 'luggage', 'casier', 'bagages', 'armadietto', 'bagagli', 'cacifo', 'bagagem', 'taquilla', 'equipaje', 'dolap', 'bavul', 'dollap'] },
    { id: 'food', icon: 'food', kw: ['essen', 'restaurant', 'cafeteria', 'kaffee', 'mittagessen', 'menü', 'food', 'eat', 'lunch', 'coffee', 'manger', 'repas', 'café', 'mangiare', 'pranzo', 'caffè', 'comer', 'comida', 'almoço', 'yemek', 'kahve', 'ushqim', 'kafe'] },
    { id: 'emergency', icon: 'emergency', kw: ['notfall', 'notaufnahme', 'unfall', 'emergency', 'a&e', 'urgent', 'urgence', 'urgences', 'pronto soccorso', 'urgenza', 'urgência', 'urgencias', 'acil', 'urgjenca'] },
    { id: 'info', icon: 'info', kw: ['information', 'empfang', 'rezeption', 'anmeldung', 'auskunft', 'reception', 'help desk', 'accueil', 'informazione', 'ricezione', 'receção', 'recepción', 'danışma', 'recepsion'] },
    { id: 'parking', icon: 'parking', kw: ['parkhaus', 'parkieren', 'parkplatz', 'parkticket', 'kassenautomat', 'auto', 'parking', 'car park', 'ticket machine', 'stationnement', 'parcheggio', 'autosilo', 'estacionamento', 'aparcamiento', 'otopark', 'parkim'] },
    { id: 'bus', icon: 'bus', kw: ['bus', 'haltestelle', 'öv', 'bus stop', 'arrêt', 'fermata', 'paragem', 'parada', 'otobüs', 'autobus', 'stacion'] },
    { id: 'chapel', icon: 'chapel', kw: ['kapelle', 'seelsorge', 'gebet', 'stille', 'chapel', 'prayer', 'chaplain', 'chapelle', 'prière', 'aumônerie', 'cappella', 'preghiera', 'capela', 'capilla', 'şapel', 'ibadet', 'kapela', 'lutje'] },
  ];

  /* Points of interest. Positions without `verify` are taken from the official area plan (Arealplan V20). */
  const PLACES = [
    { id: 'info-31', cat: 'info', building: '31', x: 1206, y: 341, name: { de: 'Zentrale Information', fr: 'Information centrale', it: 'Informazione centrale', en: 'Central information' } },
    { id: 'pharmacy-31', cat: 'pharmacy', building: '31', x: 1206, y: 315, name: { de: 'Apotheke', fr: 'Pharmacie', it: 'Farmacia', en: 'Pharmacy' } },

    { id: 'er-a', cat: 'emergency', building: '31', x: 1160, y: 381, badge: 'A', name: { de: '24notfallpraxis', fr: '24notfallpraxis (cabinet d’urgence)', it: '24notfallpraxis (studio d’urgenza)', en: '24notfallpraxis (walk-in emergency practice)' } },
    { id: 'er-b', cat: 'emergency', building: '31', x: 1160, y: 168, badge: 'B', name: { de: 'Notfallzentrum', fr: 'Centre des urgences', it: 'Centro di pronto soccorso', en: 'Emergency centre' } },
    { id: 'er-c', cat: 'emergency', building: '33', x: 1271, y: 450, badge: 'C', name: { de: 'Notfall Kinderspital', fr: 'Urgences pédiatriques', it: 'Pronto soccorso pediatrico', en: "Children's emergency" } },
    { id: 'er-d', cat: 'emergency', building: '21', x: 801, y: 413, badge: 'D', name: { de: 'Notfall Frauenklinik', fr: 'Urgences gynécologiques', it: 'Pronto soccorso ginecologico', en: "Women's clinic emergency" } },
    { id: 'er-e', cat: 'emergency', building: '11', x: 322, y: 393, badge: 'E', name: { de: 'Notfall lups', fr: 'Urgences lups', it: 'Pronto soccorso lups', en: 'lups emergency' } },

    { id: 'pay-1', cat: 'parking', building: '31', x: 1403, y: 157, name: { de: 'Kassenautomat', fr: 'Caisse automatique', it: 'Cassa automatica', en: 'Pay machine' } },
    { id: 'pay-2', cat: 'parking', building: '30', x: 1133, y: 474, name: { de: 'Kassenautomat', fr: 'Caisse automatique', it: 'Cassa automatica', en: 'Pay machine' } },
    { id: 'pay-3', cat: 'parking', building: '30', x: 1170, y: 500, name: { de: 'Kassenautomat', fr: 'Caisse automatique', it: 'Cassa automatica', en: 'Pay machine' } },
    { id: 'pay-4', cat: 'parking', building: '34', x: 1108, y: 583, name: { de: 'Kassenautomat Parkhaus', fr: 'Caisse automatique parking', it: 'Cassa automatica autosilo', en: 'Car park pay machine' } },
    { id: 'pay-5', cat: 'parking', building: '34', x: 1202, y: 635, name: { de: 'Kassenautomat Parkhaus', fr: 'Caisse automatique parking', it: 'Cassa automatica autosilo', en: 'Car park pay machine' } },
    { id: 'pay-6', cat: 'parking', building: '34', x: 1016, y: 606, name: { de: 'Kassenautomat', fr: 'Caisse automatique', it: 'Cassa automatica', en: 'Pay machine' } },
    { id: 'park-34', cat: 'parking', building: '34', x: 1278, y: 617, name: { de: 'Parkhaus Besuchende', fr: 'Parking visiteurs', it: 'Autosilo visitatori', en: 'Visitor car park' } },

    { id: 'bus-1', cat: 'bus', building: '34', x: 1125, y: 672, name: { de: 'Bushaltestelle Linie 9, 19, 30', fr: 'Arrêt de bus lignes 9, 19, 30', it: 'Fermata bus linee 9, 19, 30', en: 'Bus stop lines 9, 19, 30' } },
    { id: 'bus-2', cat: 'bus', building: '34', x: 1218, y: 721, name: { de: 'Bushaltestelle Spitalstrasse', fr: 'Arrêt de bus Spitalstrasse', it: 'Fermata bus Spitalstrasse', en: 'Bus stop Spitalstrasse' } },
    { id: 'chapel-15', cat: 'chapel', building: '15', x: 401, y: 273, name: { de: 'Kapelle', fr: 'Chapelle', it: 'Cappella', en: 'Chapel' } },

    // ↓ Not on the official plan – placeholders until LUKS confirms the exact positions.
    { id: 'wc-31', cat: 'wc', building: '31', floor: 0, x: 1252, y: 330, verify: true },
    { id: 'wc-33', cat: 'wc', building: '33', floor: 0, x: 1318, y: 470, verify: true },
    { id: 'wc-30', cat: 'wc', building: '30', floor: 0, x: 1050, y: 470, verify: true },
    { id: 'wc-21', cat: 'wc', building: '21', floor: 0, x: 905, y: 400, verify: true },
    { id: 'wca-31', cat: 'wc_access', building: '31', floor: 0, x: 1285, y: 352, verify: true },
    { id: 'wca-33', cat: 'wc_access', building: '33', floor: 0, x: 1340, y: 500, verify: true },
    { id: 'wca-30', cat: 'wc_access', building: '30', floor: 0, x: 1090, y: 470, verify: true },
    { id: 'baby-31', cat: 'baby', building: '31', floor: 0, x: 1255, y: 368, verify: true },
    { id: 'baby-33', cat: 'baby', building: '33', floor: 0, x: 1240, y: 500, verify: true },
    { id: 'baby-21', cat: 'baby', building: '21', floor: 0, x: 860, y: 445, verify: true },
    { id: 'kiosk-31', cat: 'kiosk', building: '31', floor: 0, x: 1150, y: 300, verify: true, name: { de: 'Kiosk Eingangshalle', fr: 'Kiosque hall d’entrée', it: 'Chiosco atrio', en: 'Kiosk, entrance hall' } },
    { id: 'atm-31', cat: 'atm', building: '31', floor: 0, x: 1112, y: 340, verify: true },
    { id: 'cash-31', cat: 'cash', building: '31', floor: 0, x: 1112, y: 300, verify: true, name: { de: 'Patientenkasse', fr: 'Caisse des patients', it: 'Cassa pazienti', en: 'Patient cash desk' } },
    { id: 'lockers-31', cat: 'lockers', building: '31', floor: 0, x: 1290, y: 318, verify: true },
  ];

  /* Restaurants – names and links from luks.ch / area plan. Fill in `hours` (and positions marked verify) when confirmed.
   * hours format: [{ d: [1,2,3,4,5], f: '07:00', t: '19:00' }]  (d: 0 = Sunday … 6 = Saturday)
   */
  const RESTAURANTS = [
    { id: 'feingut', kind: 'kindRestaurant', building: '31', x: 1207, y: 289, name: 'Feingut',
      url: GASTRO + '/restaurant-feingut', hours: null,
      desc: { de: 'Restaurant im Spitalzentrum für Patientinnen, Besuchende und Mitarbeitende.', fr: 'Restaurant du centre hospitalier pour patients, visiteurs et collaborateurs.', it: 'Ristorante nel centro ospedaliero per pazienti, visitatori e collaboratori.', en: 'Restaurant in the main hospital for patients, visitors and staff.' } },
    { id: 'vitamins', kind: 'kindRestaurant', building: '10', x: 624, y: 432, name: 'Feingut Vitamins',
      url: GASTRO + '/restaurant-vitamins', hours: null,
      desc: { de: 'Restaurant bei Haus 10.', fr: 'Restaurant près du bâtiment 10.', it: "Ristorante presso l'edificio 10.", en: 'Restaurant at building 10.' } },
    { id: 'kafi', kind: 'kindCafe', building: '31', x: 1240, y: 290, verify: true, name: 'Kafi',
      url: GASTRO + '/kafi', hours: null,
      desc: { de: 'Kaffee, Gebäck und Kleinigkeiten.', fr: 'Café, pâtisseries et en-cas.', it: 'Caffè, dolci e spuntini.', en: 'Coffee, pastries and snacks.' } },
    { id: 'foodtruck', kind: 'kindFoodtruck', building: null, x: null, y: null, name: 'Foodtruck',
      url: GASTRO + '/foodtruck', hours: null,
      desc: { de: 'Wechselnde Gerichte zum Mitnehmen.', fr: 'Plats à emporter variés.', it: 'Piatti da asporto che cambiano.', en: 'Changing take-away dishes.' } },
    { id: 'azzurro', kind: 'kindRestaurant', building: '21', x: 940, y: 420, name: 'Feingut Azzurro',
      url: GASTRO, hours: null,
      desc: { de: 'Restaurant in der Frauenklinik.', fr: 'Restaurant de la clinique gynécologique.', it: 'Ristorante nella clinica ginecologica.', en: "Restaurant in the women's clinic." } },
    { id: 'xund', kind: 'kindBistro', building: '46', x: 1598, y: 590, name: 'XUND Bistro',
      url: GASTRO, hours: null,
      desc: { de: 'Bistro im XUND Bildungszentrum.', fr: 'Bistro du centre de formation XUND.', it: 'Bistrò nel centro di formazione XUND.', en: 'Bistro in the XUND training centre.' } },
  ];

  /* Search directory – departments, services and doctors with everyday words in many languages.
   * Departments without verify are clearly identified on the area plan; the rest are assumed to be in Haus 31.
   */
  const DIRECTORY = [
    { id: 'emergency', type: 'dept', building: '31', x: 1160, y: 168,
      name: { de: 'Notfallzentrum', fr: 'Centre des urgences', it: 'Pronto soccorso', en: 'Emergency centre' },
      kw: ['notfall', 'notaufnahme', 'unfall', 'notarzt', 'emergency', 'a&e', 'accident', 'urgences', 'urgence', 'pronto soccorso', 'urgenza', 'urgência', 'urgencias', 'acil', 'urgjenca', 'emergjenca'] },
    { id: 'walkin', type: 'dept', building: '31', x: 1160, y: 381,
      name: { de: '24notfallpraxis', fr: '24notfallpraxis (cabinet d’urgence)', it: '24notfallpraxis (studio d’urgenza)', en: '24notfallpraxis (walk-in practice)' },
      kw: ['hausarzt', 'notfallpraxis', 'walk-in', 'gp', 'family doctor', 'médecin de garde', 'medico di guardia', 'clínico geral', 'médico de cabecera', 'aile hekimi', 'mjek familje'] },
    { id: 'eye', type: 'dept', building: '30', x: 1077, y: 500,
      name: { de: 'Augenklinik', fr: 'Clinique ophtalmologique', it: 'Clinica oftalmologica', en: 'Eye clinic' },
      kw: ['auge', 'augen', 'augenarzt', 'augenärztin', 'sehen', 'brille', 'ophthalmologie', 'eye', 'eyes', 'eye doctor', 'vision', 'ophthalmology', 'yeux', 'oeil', 'ophtalmologue', 'oculiste', 'occhi', 'oculista', 'oftalmologo', 'olhos', 'oftalmologista', 'ojos', 'göz', 'göz doktoru', 'sy', 'sytë', 'okulist'] },
    { id: 'children', type: 'dept', building: '33', x: 1290, y: 482,
      name: { de: 'Kinderspital', fr: 'Hôpital pédiatrique', it: 'Ospedale pediatrico', en: "Children's hospital" },
      kw: ['kind', 'kinder', 'kinderarzt', 'kinderärztin', 'pädiatrie', 'säugling', 'baby', 'child', 'children', 'kids', 'paediatrics', 'pediatrician', 'enfant', 'pédiatre', 'pédiatrie', 'bambino', 'bambini', 'pediatra', 'criança', 'niño', 'çocuk', 'çocuk doktoru', 'fëmijë', 'pediatër'] },
    { id: 'women', type: 'dept', building: '21', x: 893, y: 432,
      name: { de: 'Frauenklinik', fr: 'Clinique gynécologique et obstétrique', it: 'Clinica ginecologica e ostetrica', en: "Women's clinic & maternity" },
      kw: ['frauenarzt', 'frauenärztin', 'gynäkologie', 'schwanger', 'schwangerschaft', 'geburt', 'hebamme', 'gebärsaal', 'pregnancy', 'pregnant', 'birth', 'midwife', 'maternity', 'gynaecology', 'gynecologist', 'grossesse', 'enceinte', 'accouchement', 'sage-femme', 'maternité', 'gravidanza', 'incinta', 'parto', 'ostetrica', 'gravidez', 'grávida', 'embarazo', 'embarazada', 'hamile', 'doğum', 'shtatzënë', 'lindje'] },
    { id: 'psychiatry', type: 'dept', building: '11', x: 326, y: 436,
      name: { de: 'lups – Luzerner Psychiatrie', fr: 'lups – Psychiatrie lucernoise', it: 'lups – Psichiatria lucernese', en: 'lups – Lucerne Psychiatry' },
      kw: ['psychiatrie', 'psyche', 'psychologe', 'depression', 'angst', 'krise', 'mental health', 'psychiatry', 'anxiety', 'santé mentale', 'psychiatre', 'salute mentale', 'psichiatra', 'saúde mental', 'salud mental', 'psikiyatri', 'ruh sağlığı', 'psikiatri'] },
    { id: 'mri', type: 'service', building: '51', x: 1024, y: 340,
      name: { de: 'MRT (Container Haus 51)', fr: 'IRM (conteneur bâtiment 51)', it: 'Risonanza magnetica (container edificio 51)', en: 'MRI (container building 51)' },
      kw: ['mrt', 'mri', 'magnetresonanz', 'kernspin', 'tomographie', 'irm', 'risonanza', 'ressonância', 'resonancia', 'mr', 'emar', 'rezonans'] },
    { id: 'radiology', type: 'dept', building: '31', x: 1180, y: 232, verify: true,
      name: { de: 'Radiologie', fr: 'Radiologie', it: 'Radiologia', en: 'Radiology' },
      kw: ['röntgen', 'roentgen', 'x-ray', 'xray', 'rx', 'ct', 'computertomographie', 'ultraschall', 'sonographie', 'bildgebung', 'imaging', 'scan', 'ultrasound', 'radiographie', 'radio', 'scanner', 'échographie', 'radiografia', 'raggi', 'tac', 'ecografia', 'raio-x', 'raio x', 'rayos x', 'radiografía', 'tomografi', 'rreze x', 'radiografi'] },
    { id: 'lab', type: 'service', building: '31', x: 1180, y: 232, verify: true,
      name: { de: 'Labor & Blutentnahme', fr: 'Laboratoire & prise de sang', it: 'Laboratorio & prelievo di sangue', en: 'Laboratory & blood tests' },
      kw: ['blut', 'blutentnahme', 'blutprobe', 'bluttest', 'blutabnahme', 'labor', 'urin', 'blood', 'blood test', 'blood sample', 'lab', 'urine', 'sang', 'prise de sang', 'analyse', 'laboratoire', 'prelievo', 'sangue', 'analisi', 'análise ao sangue', 'análisis de sangre', 'sangre', 'kan', 'kan tahlili', 'tahlil', 'gjak', 'analizë gjaku'] },
    { id: 'cardiology', type: 'dept', building: '31', x: 1180, y: 232, verify: true,
      name: { de: 'Kardiologie (Herz)', fr: 'Cardiologie (cœur)', it: 'Cardiologia (cuore)', en: 'Cardiology (heart)' },
      kw: ['herz', 'herzarzt', 'ekg', 'puls', 'herzinfarkt', 'blutdruck', 'heart', 'cardiologist', 'ecg', 'blood pressure', 'cœur', 'coeur', 'cardiologue', 'cuore', 'cardiologo', 'coração', 'corazón', 'kalp', 'zemër', 'kardiolog'] },
    { id: 'orthopedics', type: 'dept', building: '31', x: 1180, y: 232, verify: true,
      name: { de: 'Orthopädie & Traumatologie', fr: 'Orthopédie & traumatologie', it: 'Ortopedia & traumatologia', en: 'Orthopaedics & trauma' },
      kw: ['knochen', 'gelenk', 'knie', 'hüfte', 'rücken', 'bruch', 'fraktur', 'schulter', 'bone', 'joint', 'knee', 'hip', 'back pain', 'fracture', 'shoulder', 'os', 'genou', 'hanche', 'dos', 'ossa', 'ginocchio', 'frattura', 'schiena', 'osso', 'joelho', 'hueso', 'rodilla', 'kemik', 'diz', 'kırık', 'kockë', 'gju'] },
    { id: 'dermatology', type: 'dept', building: '31', x: 1180, y: 232, verify: true,
      name: { de: 'Dermatologie (Haut)', fr: 'Dermatologie (peau)', it: 'Dermatologia (pelle)', en: 'Dermatology (skin)' },
      kw: ['haut', 'hautarzt', 'ausschlag', 'muttermal', 'allergie', 'skin', 'rash', 'mole', 'peau', 'dermatologue', 'pelle', 'dermatologo', 'pele', 'piel', 'cilt', 'deri', 'lëkurë'] },
    { id: 'neurology', type: 'dept', building: '31', x: 1180, y: 232, verify: true,
      name: { de: 'Neurologie', fr: 'Neurologie', it: 'Neurologia', en: 'Neurology' },
      kw: ['kopf', 'kopfschmerzen', 'migräne', 'schlaganfall', 'nerven', 'schwindel', 'headache', 'migraine', 'stroke', 'brain', 'dizziness', 'tête', 'mal de tête', 'avc', 'testa', 'mal di testa', 'ictus', 'cabeça', 'cabeza', 'baş ağrısı', 'inme', 'kokë', 'dhimbje koke'] },
    { id: 'ent', type: 'dept', building: '31', x: 1180, y: 232, verify: true,
      name: { de: 'Hals-Nasen-Ohren (HNO)', fr: 'ORL (oreilles, nez, gorge)', it: 'Otorinolaringoiatria (ORL)', en: 'Ear, nose & throat (ENT)' },
      kw: ['ohr', 'ohren', 'nase', 'hals', 'hören', 'hno', 'ear', 'nose', 'throat', 'ent', 'hearing', 'oreille', 'nez', 'gorge', 'orl', 'orecchio', 'naso', 'gola', 'ouvido', 'garganta', 'oído', 'nariz', 'kulak', 'burun', 'boğaz', 'vesh', 'hundë', 'fyt'] },
    { id: 'oncology', type: 'dept', building: '31', x: 1180, y: 232, verify: true,
      name: { de: 'Onkologie (Tumorzentrum)', fr: 'Oncologie', it: 'Oncologia', en: 'Oncology (cancer care)' },
      kw: ['krebs', 'tumor', 'chemo', 'chemotherapie', 'cancer', 'oncology', 'chimiothérapie', 'cancro', 'tumore', 'chemioterapia', 'câncer', 'cáncer', 'kanser', 'kancer'] },
    { id: 'urology', type: 'dept', building: '31', x: 1180, y: 232, verify: true,
      name: { de: 'Urologie', fr: 'Urologie', it: 'Urologia', en: 'Urology' },
      kw: ['blase', 'niere', 'prostata', 'harn', 'bladder', 'kidney', 'prostate', 'vessie', 'rein', 'vescica', 'rene', 'bexiga', 'rim', 'vejiga', 'riñón', 'böbrek', 'mesane', 'veshkë', 'fshikëz'] },
    { id: 'physio', type: 'service', building: '31', x: 1180, y: 232, verify: true,
      name: { de: 'Physiotherapie', fr: 'Physiothérapie', it: 'Fisioterapia', en: 'Physiotherapy' },
      kw: ['physio', 'therapie', 'bewegung', 'reha', 'rehabilitation', 'physiotherapy', 'kiné', 'kinésithérapie', 'fisioterapia', 'riabilitazione', 'fizyoterapi', 'fizioterapi'] },
    { id: 'interpreting', type: 'service', building: '31', x: 1206, y: 341, verify: true,
      name: { de: 'Dolmetschdienst', fr: "Service d'interprétariat", it: 'Servizio di interpretariato', en: 'Interpreting service' },
      kw: ['dolmetscher', 'dolmetschen', 'übersetzer', 'übersetzung', 'sprache', 'interpreter', 'translation', 'translator', 'interprète', 'traduction', 'interprete', 'traduzione', 'intérprete', 'tradução', 'traducción', 'tercüman', 'çevirmen', 'përkthyes'] },
    { id: 'doc-sample-eye', type: 'doctor', sample: true, building: '30', x: 1077, y: 500,
      name: { de: 'Dr. med. Muster (Beispiel) – Augenklinik', fr: 'Dr méd. Muster (exemple) – ophtalmologie', it: 'Dr. med. Muster (esempio) – oculistica', en: 'Dr Muster (sample) – eye clinic' },
      kw: ['muster', 'dr muster', 'beispiel'] },
  ];

  window.LUKS_CONFIG = CONFIG;
  window.LUKS_DATA = { BUILDINGS, CATS, PLACES, RESTAURANTS, DIRECTORY };
})();
