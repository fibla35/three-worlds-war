// ===== Three Worlds War — datos del juego (prototipo) =====
'use strict';
const FACTIONS = {
  res: { id:'res', name:'La Resistencia', atlas:'resistencia', color:'#4a8cff', dark:'#1b2d55',
    resA:'Créditos', resB:'Combustible', resC:'Uranio', colC:'#9dff5a', icon:'comun/simbolos/icono_resistencia', emblem:'comun/simbolos/simbolo_resistencia',
    strong:'✈️ Aire', desc:'Equilibrados. Unidades aéreas más fuertes. +1 constructor desde Núcleo 5.',
    ground:'comun/suelos/res_hierba', ground2:'comun/suelos/res_hormigon', coreBase:'resistencia/nucleo/cuartel_general',
    colA:'#ffd34d', colB:'#ff8a3d' },
  volt: { id:'volt', name:'Voltempire', atlas:'voltempire', color:'#ff8a1f', dark:'#4a2408',
    resA:'Chatarra', resB:'Energía', resC:'Núcleos de fusión', colC:'#ff6bd6', icon:'comun/simbolos/icono_voltempire', emblem:'comun/simbolos/simbolo_voltempire',
    strong:'🛡️ Tierra', desc:'Tropas de tierra muy resistentes. Producción +15 %. Edificios que se reparan solos.',
    ground:'comun/suelos/volt_metal', ground2:'comun/suelos/volt_circuito', coreBase:'voltempire/nucleo/reactor_central',
    colA:'#c0c6cf', colB:'#33e0ff' },
  nuw: { id:'nuw', name:'Nuwoks', atlas:'nuwoks', color:'#8de04a', dark:'#1f3d12',
    resA:'Biomasa', resB:'Esencia', resC:'Cristal psíquico', colC:'#b78cff', icon:'comun/simbolos/icono_nuwoks', emblem:'comun/simbolos/simbolo_nuwoks',
    strong:'⚡ Velocidad', desc:'Enjambres rápidos y letales. Obras un 15 % más rápidas. La biomasa ralentiza al enemigo.',
    ground:'comun/suelos/nuw_tierra', ground2:'comun/suelos/nuw_biomasa', coreBase:'nuwoks/nucleo/corazon_colmena',
    colA:'#a6f04a', colB:'#c07bff' },
};
const FAC_IDS = ['res','volt','nuw'];

// ---- economía (de la simulación del documento de diseño) ----
const CC  = [60,400,2000,8000,28000,85000,230000,550000,1.2e6,2.3e6];   // coste base por franja de Núcleo
const TT  = [0.004,0.06,0.35,1.6,4,8,14,22,32,48];                       // horas por mejora típica
const HQC = [0,600,4000,20000,80000,260000,700000,1.6e6,3.4e6,6.5e6];   // coste para llegar a Núcleo n+1
const HQT = [0,0.05,1,4,12,24,40,60,84,120];                             // horas de obra del Núcleo
const BUILDERS = [2,2,3,3,4,4,5,5,5,5];
const WALLS = { count:[0,20,40,60,90,120,160,200,240,275], max:[0,2,3,4,5,6,7,8,9,10] };
const WALL_MAT = ['madera','madera_reforzada','piedra','piedra_tallada','hierro','acero','obsidiana','diamante','plasma','antimateria'];
const WALL_NAME = ['Madera','Madera reforzada','Piedra','Piedra tallada','Hierro','Acero','Obsidiana','Diamante','Plasma','Antimateria'];

// tipo: [recurso, pesoCoste, pesoTiempo, cuenta por Núcleo, nivel máx por Núcleo]
const BT = {
 clan:   ['A',1.2,0.5,[0,1,1,1,1,1,1,1,1,1],[0,1,1,1,1,1,1,1,1,1]],
 market: ['A',1.0,0.5,[0,0,1,1,1,1,1,1,1,1],[0,0,1,1,1,1,1,1,1,1]],
 arena:  ['B',1.2,0.6,[0,0,0,1,1,1,1,1,1,1],[0,0,0,1,1,1,1,1,1,1]],
 hall:   ['A',1.5,0.6,[0,0,0,0,1,1,1,1,1,1],[0,0,0,0,1,1,1,1,1,1]],
 spec:   ['B',1.8,0.8,[0,0,0,0,0,1,1,1,1,1],[0,0,0,0,0,1,1,1,1,1]],
 silo:   ['C',1.5,0.8,[0,0,0,0,0,0,1,1,1,1],[0,0,0,0,0,0,1,1,1,1]],
 prodA:  ['B',0.4,0.5,[1,2,3,4,5,6,6,7,7,7],[2,4,5,6,8,9,10,12,13,15]],
 prodB:  ['A',0.4,0.5,[1,2,3,4,5,6,6,7,7,7],[2,4,5,6,8,9,10,12,13,15]],
 prodC:  ['B',0.4,0.6,[0,0,0,0,1,2,2,3,3,3],[0,0,0,0,2,3,5,6,8,10]],
 storA:  ['B',0.7,0.6,[1,1,2,2,2,2,3,3,4,4],[1,3,5,6,7,8,10,11,13,15]],
 storB:  ['A',0.7,0.6,[1,1,2,2,2,2,3,3,4,4],[1,3,5,6,7,8,10,11,13,15]],
 camp:   ['B',0.8,0.8,[1,1,2,2,3,3,4,4,4,4],[1,2,3,5,6,7,8,9,10,10]],
 barracks:['B',0.9,0.8,[1,1,1,1,2,2,2,2,2,2],[2,3,4,5,6,7,8,9,10,10]],
 lab:    ['B',1.3,1.0,[0,0,1,1,1,1,1,1,1,1],[0,0,2,3,5,6,7,8,9,10]],
 support:['B',1.3,1.0,[0,0,0,0,1,1,1,1,1,1],[0,0,0,0,2,3,5,6,7,8]],
 comms:  ['A',0.9,0.8,[0,0,1,1,1,1,1,1,1,1],[0,0,1,3,5,6,7,8,9,10]],
 hero:   ['C',1.5,1.0,[0,0,0,0,0,0,1,1,1,1],[0,0,0,0,0,0,1,2,3,5]],
 d1:     ['A',1.0,0.9,[2,2,2,3,3,4,5,6,7,7],[2,3,5,6,7,8,10,11,13,15]],
 d2:     ['A',1.3,1.0,[0,0,1,1,2,3,4,4,4,4],[0,0,2,3,5,6,7,8,10,12]],
 d3:     ['A',1.3,1.0,[0,0,0,1,2,3,3,4,4,4],[0,0,0,2,3,5,6,7,8,10]],
 d4:     ['A',1.6,1.2,[0,0,0,0,1,1,2,2,3,3],[0,0,0,0,2,3,5,6,8,10]],
 d5:     ['A',1.8,1.3,[0,0,0,0,0,1,2,2,3,3],[0,0,0,0,0,2,3,5,6,8]],
 d6:     ['A',1.5,1.1,[0,0,1,1,1,2,2,2,3,3],[0,0,1,3,5,6,7,8,10,12]],
 ult:    ['C',2.5,1.6,[0,0,0,0,0,0,0,0,1,1],[0,0,0,0,0,0,0,0,3,5]],
 patrol: ['C',1.6,1.1,[0,0,0,0,1,1,1,1,1,1],[0,0,0,0,1,2,3,4,5,6]],
 radar:  ['A',1.2,0.9,[0,0,0,0,1,1,1,1,2,2],[0,0,0,0,2,3,4,5,6,8]],
 weather:['C',2.0,1.2,[0,0,0,0,0,0,0,1,1,1],[0,0,0,0,0,0,0,1,2,3]],
 trap1:  ['A',0.25,0.3,[0,2,4,4,6,6,6,6,6,6],[0,1,2,3,4,5,5,6,7,8]],
 trap2:  ['A',0.35,0.3,[0,0,0,0,2,2,4,4,4,4],[0,0,0,0,1,2,3,4,5,5]],
};

// sprites y nombres por facción. lv: 'L4' niveles 1/5/10/15, 'L3' 1/5/10, 'L2' 1/5, 'L1' sin niveles, 'D' defensa con ramas, 'U' definitiva 1/3/5
const BNAMES = {
 res:{ prodA:['mina_creditos','Mina de créditos'], prodB:['refineria','Refinería'], prodC:['mina_creditos','Extractor de uranio'], storA:['banco','Banco blindado'], storB:['deposito_combustible','Depósito de combustible'],
   camp:['campamento','Campamento'], barracks:['cuartel','Cuartel'], lab:['laboratorio','Laboratorio'], support:['centro_mando','Centro de mando'], comms:['torre_comunicaciones','Torre de comunicaciones'],
   clan:['sede_clan','Sede del clan'], market:['mercado','Mercado'], arena:['arena','Arena de entrenamiento'], hall:['sala_trofeos','Sala de trofeos'], spec:['taller_especial','Garaje de élite'], silo:['silo','Silo de misiles'],
   hero:['barracon_heroe','Barracón del héroe'], hut:['taller','Taller de ingenieros'],
   d1:['ametralladora','Torreta'], d2:['mortero','Mortero'], d3:['antiaerea','Batería antiaérea'], d4:['lanzallamas','Lanzallamas'], d5:['artilleria','Artillería pesada'], d6:['bunker','Búnker'], ult:['canon_orbital','Cañón orbital'], patrol:['patrulla_base','Hangar de patrulla'], radar:['radar','Torre radar'], weather:['control_clima','Estación climática'], trap1:['trampa1','Mina terrestre'], trap2:['trampa2','Cohete oculto'],
   branch:{d1:['Ametralladora doble','Cañón pesado'],d2:['De racimo','Incendiario'],d3:['Muchos misiles','Misil guiado'],d4:['Llama ancha','Plasma azul'],d5:['Cañón largo','Doble cañón'],d6:['Nidos de ametralladora','Techo de cohetes']} },
 volt:{ prodA:['desguace','Desguace'], prodB:['generador','Generador'], prodC:['desguace','Forja de fusión'], storA:['compactador','Compactador'], storB:['bateria','Batería'],
   camp:['hangar','Hangar'], barracks:['fabrica','Fábrica de ensamblaje'], lab:['centro_id','Centro de I+D'], support:['satelite','Satélite'], comms:['antena','Antena'],
   clan:['sede_clan','Sede del clan'], market:['mercado','Mercado'], arena:['arena','Arena de entrenamiento'], hall:['sala_trofeos','Sala de trofeos'], spec:['taller_especial','Bahía de mechas'], silo:['silo','Cañón orbital de clan'],
   hero:['forja_prototipos','Forja de prototipos'], hut:['estacion_drones','Estación de drones'],
   d1:['torreta_laser','Torreta láser'], d2:['canon_plasma','Cañón de plasma'], d3:['tesla_aerea','Torre Tesla aérea'], d4:['bobina_tesla','Bobina Tesla'], d5:['canon_riel','Cañón de riel'], d6:['generador_escudo','Generador de escudo'], ult:['titan_guardian','Titán guardián'], patrol:['patrulla_base','Muelle de drones'], radar:['radar','Pilón escáner'], weather:['control_clima','Torre climática'], trap1:['trampa1','Mina EMP'], trap2:['trampa2','Imán'],
   branch:{d1:['Rayo continuo','Láser dividido'],d2:['Pulso','Sobrecarga'],d3:['En cadena','Lanza única'],d4:['Alta','Triple punta'],d5:['Riel largo','Doble riel'],d6:['Cúpula','Cuatro pilones']} },
 nuw:{ prodA:['estanque_biomasa','Estanque de biomasa'], prodB:['pozo_esencia','Pozo de esencia'], prodC:['estanque_biomasa','Geoda psíquica'], storA:['saco_biomasa','Saco de biomasa'], storB:['glandula_esencia','Glándula de esencia'],
   camp:['nido','Nido'], barracks:['incubadora','Incubadora'], lab:['camara_evolucion','Cámara de evolución'], support:['santuario','Santuario'], comms:['faro_psiquico','Faro psíquico'],
   clan:['sede_clan','Sede del clan'], market:['mercado','Mercado'], arena:['arena','Arena de entrenamiento'], hall:['sala_trofeos','Sala de trofeos'], spec:['taller_especial','Charca de mutación'], silo:['silo','Cañón de esporas'],
   hero:['trono_reina','Trono de la reina'], hut:['guarderia_larvas','Guardería de larvas'],
   d1:['lanzaespinas','Lanzaespinas'], d2:['escupidor_acido','Escupidor de ácido'], d3:['colmena_avispas','Colmena de avispas'], d4:['fauces','Fauces'], d5:['gusano_asedio','Gusano de asedio'], d6:['nodo_biomasa','Nodo de biomasa'], ult:['mente_colmena','Mente colmena'], patrol:['patrulla_base','Nido de mantas'], radar:['radar','Tallo vigía'], weather:['control_clima','Aguja climática'], trap1:['trampa1','Saco de esporas'], trap2:['trampa2','Tentáculo atrapador'],
   branch:{d1:['Espinas venenosas','Espinas perforantes'],d2:['Corrosivo','Pegajoso'],d3:['Enjambre','Avispa gigante'],d4:['Muchos dientes','Con tentáculos'],d5:['Cresta de hueso','Doble gusano'],d6:['Zarcillos','Bulbo sanador'] } },
};
const LVSTYLE = { clan:'L1',market:'L1',arena:'L1',hall:'L1',spec:'L1',silo:'L1',prodA:'L4',prodB:'L4',prodC:'L4',storA:'L4',storB:'L4',camp:'L3',barracks:'L3',lab:'L3',support:'L2',comms:'L3',hero:'L1',hut:'L1',
  patrol:'L3p',radar:'L2d',weather:'L1d',d1:'D',d2:'D',d3:'D',d4:'D',d5:'D',d6:'D',ult:'U',trap1:'L1',trap2:'L1' };
// todo ocupa 1 casilla (2×2 unidades) y el Núcleo 2×2 casillas (4×4 unidades)
const SIZE = { core:4, clan:2,market:2,arena:2,hall:2,spec:2,silo:2, prodA:2,prodB:2,prodC:2,storA:2,storB:2,camp:2,barracks:2,lab:2,support:2,comms:2,hero:2,hut:2,
  patrol:2,radar:2,weather:2,d1:2,d2:2,d3:2,d4:2,d5:2,d6:2,ult:2,trap1:2,trap2:2, wall:1, deco:2, obst:2 };
const CATS = {
  eco: { name:'Economía', items:['prodA','prodB','prodC','storA','storB','hut'] },
  army:{ name:'Ejército', items:['camp','barracks','lab','support','comms','hero'] },
  def: { name:'Defensas', items:['d1','d2','d3','d4','d5','d6','ult','patrol','radar','weather','trap1','trap2'] },
  wall:{ name:'Muros', items:['wall'] },
  esp: { name:'Especiales', items:['clan','market','arena','hall','spec','silo'] },
  deco:{ name:'Decoración', items:['deco'] },
};
// defensas: alcance (casillas), daño/s, objetivos, área, especial
const DEFSTAT = {
 d1:{ hp:420, dps:22, range:7, air:false, ground:true, splash:0, rate:0.8, fx:'proj' },
 d2:{ hp:500, dps:20, range:10, min:3, air:false, ground:true, splash:1.6, rate:2.5, fx:'arc' },
 d3:{ hp:450, dps:55, range:10, air:true, ground:false, splash:0, rate:1.0, fx:'missile' },
 d4:{ hp:600, dps:45, range:4, air:true, ground:true, splash:1.2, rate:0.5, fx:'zap' },
 d5:{ hp:700, dps:70, range:12, air:false, ground:true, splash:0.6, rate:4, fx:'beam' },
 d6:{ hp:800, dps:20, range:6, air:true, ground:true, splash:0, rate:0.7, fx:'proj' },  // especial por facción
 ult:{ hp:2200, dps:110, range:13, air:true, ground:true, splash:2.2, rate:3, fx:'big' },
 patrol:{ hp:700 }, radar:{ hp:550 }, weather:{ hp:900 },
 trap1:{ hp:1, dmg:260, radius:1.6, air:false, ground:true },
 trap2:{ hp:1, dmg:550, radius:0.8, air:true, ground:false },
};
const ECOSTAT = { core:{hp:2500}, prodA:{hp:400}, prodB:{hp:400}, prodC:{hp:500}, storA:{hp:700}, storB:{hp:700}, camp:{hp:300}, barracks:{hp:450}, lab:{hp:500},
  support:{hp:600}, comms:{hp:600}, hero:{hp:700}, hut:{hp:250}, wall:{hp:300} };

// ---- tropas: [sprite, nombre, función, plazas, vida, daño/s, velocidad, alcance, aérea, objetivo, extra, Núcleo para desbloquear] ----
// objetivo: any | def | res | wall | air
const UNITS = {
 res:[
  ['marine','Marine','Básica',1,100,12,1.0,0.7,false,'any',{},1],
  ['francotirador','Francotirador','A distancia',1,55,16,1.0,4,false,'any',{},1],
  ['artillero_minigun','Artillero pesado','Tanque',5,900,20,0.7,0.8,false,'def',{},2],
  ['lanzallamas','Lanzallamas','Daño en área',3,180,30,0.9,1.5,false,'any',{splash:1.3},3],
  ['medica','Médica','Apoyo (cura)',4,220,0,0.9,3,false,'heal',{heal:28},4],
  ['lanzacohetes','Lanzacohetes','Demoledor',2,140,40,1.0,3,false,'wall',{wallx:3},5],
  ['jetpack','Soldado jetpack','Aérea ligera',2,144,24,1.4,2,true,'any',{},6],
  ['helicoptero','Helicóptero de asalto','Aérea especial',3,360,33,1.3,3,true,'def',{},7],
  ['bombardero','Bombardero','Aérea pesada',5,720,50,0.9,1,true,'def',{splash:1.6},8],
  ['nave_nodriza','Nave nodriza','Élite (suelta marines)',12,3100,121,0.7,4,true,'def',{spawn:'marine',every:4},9],
  ['ingeniero','Ingeniero de combate','Pone una torreta',3,260,22,1.0,3,false,'any',{turret:true},6],
  ['buggy','Buggy de asalto','Rápido, va a recursos',3,320,30,2.0,2,false,'res',{},7],
  ['paracaidistas','Paracaidistas','Caen en cualquier sitio',4,300,30,1.0,0.8,false,'any',{anywhere:true,count:2},8],
  ['caza','Caza a reacción','Ataca defensas aéreas',4,420,60,2.0,4,true,'air',{},9],
  ['tanque_asalto','Tanque de asalto','Tanque de élite',10,2400,70,0.6,4,false,'def',{splash:1},10],
  ['x_mecha','Mecha de asedio','⭐ Especial · Élite gigante',14,3800,110,0.55,4,false,'def',{splash:1.2},10],
  ['x_comando','Comando','⭐ Especial · Sigilo',2,180,30,1.2,3,false,'any',{stealth:4},6],
  ['x_operador','Operador de drones','⭐ Especial · Largo alcance',3,220,26,1.0,4.5,false,'any',{},7],
  ['x_antidisturbios','Antidisturbios','⭐ Especial · Escudo',4,800,18,0.8,0.8,false,'def',{shield:0.3},7],
  ['x_granadero','Granadero','⭐ Especial · Área',3,240,34,0.9,3.5,false,'any',{splash:1.2},8],
  ['x_moto','Moto flotante','⭐ Especial · Muy rápida',3,300,32,2.2,2,false,'res',{},8],
 ],
 volt:[
  ['robot_laser','Robot láser','Básica',1,160,9,0.85,0.7,false,'any',{},1],
  ['francotirador','Robot francotirador','A distancia',1,88,12,0.85,4,false,'any',{},1],
  ['bruto_orugas','Bruto de orugas','Tanque',5,1440,14,0.6,0.8,false,'def',{},2],
  ['robot_bomba','Robot bomba','Daño en área',3,290,21,0.75,1,false,'any',{splash:1.4},3],
  ['reparador','Robot reparador','Apoyo (repara)',4,350,0,0.75,3,false,'heal',{heal:24},4],
  ['arana','Araña','Demoledor (salta muros)',2,224,28,0.85,0.8,false,'wall',{wallx:3,jump:true},5],
  ['dron','Dron','Aérea ligera',2,120,15,1.2,2,true,'any',{},6],
  ['robot_escudo','Robot escudo','Protege a los de detrás',3,480,21,0.85,0.8,false,'def',{shield:0.3},7],
  ['robot_rodante','Robot rodante','Embiste muros',5,960,32,1.1,0.8,false,'wall',{wallx:4},8],
  ['titan','Titán','Élite',12,4160,77,0.7,1.2,false,'def',{splash:1},9],
  ['robot_taladro','Robot taladro','Pasa bajo los muros',3,420,25,0.85,0.8,false,'any',{jump:true},6],
  ['robot_iman','Robot imán','Atrae el fuego enemigo',5,1600,10,0.7,0.8,false,'def',{taunt:true},7],
  ['artilleria_andante','Artillería andante','Largo alcance',4,300,40,0.7,6,false,'def',{splash:0.8},8],
  ['nanobots','Enjambre de nanobots','Daño en área aéreo',4,260,38,1.2,1.2,true,'any',{splash:1.4},9],
  ['martillo_gigante','Martillo gigante','Destruye edificios',10,3000,95,0.6,1,false,'any',{wallx:3},10],
  ['x_titan_bola','Titán demoledor','⭐ Especial · Élite gigante',14,5200,100,0.6,1.2,false,'def',{splash:1.2,wallx:3},10],
  ['x_ninja','Robot ninja','⭐ Especial · Sigilo',2,260,40,1.6,0.8,false,'any',{stealth:3},6],
  ['x_lanzallamas','Robot lanzallamas','⭐ Especial · Área',3,400,30,0.8,1.5,false,'any',{splash:1.3},7],
  ['x_centinela','Centinela flotante','⭐ Especial · Aérea',4,500,36,1.0,3,true,'any',{},8],
  ['x_cangrejo','Cangrejo minador','⭐ Especial · Demoledor',3,350,25,1.0,1,false,'wall',{wallx:3},7],
  ['x_jetpack','Robot jetpack','⭐ Especial · Aérea',3,300,40,1.4,3,true,'def',{},8],
 ],
 nuw:[
  ['cria_enjambre','Cría de enjambre','Básica',1,85,17,1.3,0.7,false,'any',{},1],
  ['escupidor','Escupidor de ácido','A distancia',1,47,23,1.3,4,false,'any',{},1],
  ['escarabajo','Escarabajo blindado','Tanque',5,765,28,0.9,0.8,false,'def',{},2],
  ['cerebro_psiquico','Cerebro psíquico','Daño en área (onda)',3,153,43,1.15,2,false,'any',{splash:1.6},3],
  ['blob_sanador','Blob sanador','Apoyo (cura)',4,187,0,1.15,3,false,'heal',{heal:30},4],
  ['gusano','Gusano','Demoledor (bajo tierra)',2,119,57,1.3,0.8,false,'wall',{wallx:3,jump:true},5],
  ['avispa','Avispa','Aérea ligera',2,102,31,1.8,2,true,'any',{},6],
  ['alien_gris','Alien gris','Se teletransporta',3,255,43,1.3,3,false,'any',{blink:true},7],
  ['calamar','Calamar','Salta muros',5,510,64,1.3,1,false,'def',{jump:true},8],
  ['reina','Reina','Élite (suelta crías)',12,2210,156,1.0,1.5,false,'def',{spawn:'cria_enjambre',every:3},9],
  ['saltador','Saltador','Salta muros',2,170,34,1.6,0.8,false,'def',{jump:true},6],
  ['kamikaze_acido','Kamikaze de ácido','Explota',3,200,0,1.4,0.6,false,'def',{kamikaze:420},7],
  ['murcielago','Murciélago alien','Aérea rápida',3,180,40,2.2,1.5,true,'any',{},8],
  ['seta_esporas','Seta de esporas','Infecta edificios',4,320,30,1.1,2,false,'any',{dot:12},9],
  ['depredador_invisible','Depredador invisible','Sigilo',6,900,120,1.5,0.8,false,'any',{stealth:6},10],
  ['x_behemot','Behemot','⭐ Especial · Élite gigante',14,4200,170,0.8,1.5,false,'def',{splash:1},10],
  ['x_raptor','Raptor','⭐ Especial · Rápido',2,200,45,2.0,0.8,false,'any',{},6],
  ['x_manta','Manta ácida','⭐ Especial · Bombas aéreas',4,360,50,1.5,1,true,'def',{splash:1.4},8],
  ['x_sacerdotisa','Sacerdotisa psíquica','⭐ Especial · Cura',4,260,0,1.1,3,false,'heal',{heal:34},7],
  ['x_erizo','Erizo de púas','⭐ Especial · A distancia',3,300,38,1.2,3,false,'any',{},7],
  ['x_sanguijuelas','Sanguijuelas','⭐ Especial · Enjambre',3,240,30,1.5,0.8,false,'any',{},8],
 ],
};
const HEROES = {
 res:{ sprite:'HEROE_exotraje', name:'Exotraje', hp:2600, dps:70, speed:0.9, range:3, ability:'Bombardeo orbital', icon:'🚀' },
 volt:{ sprite:'HEROE_comandante', name:'Comandante robot', hp:3400, dps:55, speed:0.8, range:3.5, ability:'Escudo para todos', icon:'🛡️' },
 nuw:{ sprite:'HEROE_senor_guerra', name:'Señor de la guerra', hp:2200, dps:95, speed:1.3, range:1.2, ability:'Frenesí', icon:'🔥' },
};
const DECOS = {
 res:['pino','roble','palmera','arbusto_flores','sacos_arena','cajas','estatua_soldado','farola','fuente','antena_radar'],
 volt:['arbol_metal','arbol_cables','arbol_cristal_naranja','estatua_robot','chatarra_engranajes','farola_neon','escultura_engranaje','paneles_solares','robot_musgo','bobina_decorativa'],
 nuw:['seta_gigante','planta_tentaculos','arbol_cristal','planta_vainas','coral','huevos','arco_hueso','orbe_raices','flor_carnivora','cactus_alien'],
};
const OBST = ['roca_grande','piedras','roca_musgo','tronco_muerto','meteorito','restos_nave','roca_cristal','chatarra','cofre_gemas','tanque_roto'];

const WEATHERS = [
 { id:'clear', name:'Despejado', icon:'☀️', fx:'Sin efectos.' },
 { id:'rain', name:'Lluvia', icon:'🌧️', fx:'Defensas eléctricas +25 %, fuego −25 %.' },
 { id:'fog', name:'Niebla', icon:'🌫️', fx:'Alcance de las defensas −25 %.' },
 { id:'snow', name:'Nieve', icon:'❄️', fx:'Tropas un 20 % más lentas.' },
 { id:'toxic', name:'Niebla verde alienígena', icon:'☣️', fx:'Tropas no Nuwok pierden vida; las Nuwok se curan.' },
 { id:'ion', name:'Tormenta de iones', icon:'⚡', fx:'Caen rayos al azar sobre todo el campo.' },
 { id:'acid', name:'Lluvia ácida', icon:'🧪', fx:'Los edificios se corroen poco a poco.' },
 { id:'meteor', name:'Lluvia de meteoritos', icon:'☄️', fx:'Impactos al azar que dañan a todos.' },
 { id:'sand', name:'Tormenta de arena', icon:'🌪️', fx:'Alcance −15 % y tropas −10 % de velocidad.' },
 { id:'aurora', name:'Aurora cósmica', icon:'🌌', fx:'Botín +20 %.' },
];

// ---- niveles de tropa (laboratorio) y maestría por uso ----
const TROOP_MAX = [2,3,4,5,6,7,8,9,10,12];          // nivel máx. de tropa por Núcleo
let TROOP_STEP = 1.12;                            // +12 % vida y daño por nivel (igual que las defensas)
const MASTERY = [ // xp necesaria, gemas, nombre, color
  { xp:0,   gems:0,  name:'Recluta',  col:'#9aa3b5', icon:'🎖️' },
  { xp:25,  gems:5,  name:'Bronce',   col:'#d08a4a', icon:'🥉' },
  { xp:100, gems:10, name:'Plata',    col:'#cfd8e6', icon:'🥈' },
  { xp:300, gems:20, name:'Oro',      col:'#ffd34d', icon:'🥇' },
  { xp:800, gems:50, name:'Diamante', col:'#7ff3ff', icon:'💠' },
];
// en Bronce, Plata y Oro eliges una especialización; Diamante da +5 % a todo
const PERKS = { hp:{ n:'❤️ Coraza', d:'+5 % de vida', v:0.05 }, dmg:{ n:'💥 Furia', d:'+5 % de daño', v:0.05 }, spd:{ n:'👟 Agilidad', d:'+6 % de velocidad', v:0.06 } };

const PATROL = { res:{ name:'Dron de patrulla', dps:34, range:3.5, speed:1.7, hp:500, fx:'Ataca aire y tierra con su foco' },
  volt:{ name:'Dron centinela', dps:24, range:4, speed:1.9, hp:420, fx:'Marca al enemigo: las defensas cercanas le hacen +25 %' },
  nuw:{ name:'Manta voladora', dps:28, range:2.5, speed:1.6, hp:560, fx:'Suelta ácido a su paso (daño en área)' } };
const HEROES2 = {
 res:{ sprite:'HEROE2', name:'Comandante médica', hp:2200, dps:45, speed:1.0, range:3.5, ability:'Curación masiva', icon:'💉' },
 volt:{ sprite:'HEROE2', name:'Asesina robot', hp:1900, dps:120, speed:1.5, range:1, ability:'Golpe invisible', icon:'🗡️' },
 nuw:{ sprite:'HEROE2', name:'Madre del enjambre', hp:3000, dps:60, speed:0.9, range:1.5, ability:'Eclosión (8 crías)', icon:'🥚' },
};
const ABIL = {
 res:[ { id:'bomb', n:'Bombardeo', i:'💣', d:'Daño fuerte en una zona' }, { id:'heal', n:'Botiquín', i:'⛑️', d:'Cura a tus tropas en una zona' }, { id:'drop', n:'Refuerzos', i:'🪂', d:'Caen 4 marines donde toques' } ],
 volt:[ { id:'emp', n:'Pulso EMP', i:'⚡', d:'Apaga las defensas de la zona 4 s' }, { id:'shield', n:'Escudo', i:'🛡️', d:'Tus tropas de la zona reciben −60 % daño' }, { id:'over', n:'Sobrecarga', i:'🔋', d:'Tus tropas de la zona +50 % daño y velocidad' } ],
 nuw:[ { id:'frenzy', n:'Frenesí', i:'🔥', d:'Tus tropas de la zona +50 % daño y velocidad' }, { id:'regen', n:'Regeneración', i:'💚', d:'Cura poco a poco a las tropas de la zona' }, { id:'plague', n:'Plaga', i:'☣️', d:'Infecta los edificios de la zona' } ],
};

// para qué sirve cada recurso (se muestra en la interfaz)
const RES_USE = { A:'Defensas, muros y Núcleo', B:'Ejército, laboratorio y recolectores especiales', C:'Héroes, patrulla, clima, defensa definitiva y tropas de élite (nivel 7+)' };
// ediciones de color (skins de estructura animadas)
const ED_MAP = {
  res: { d6: 'bunker', ult: 'canon_orbital', radar: 'radar', support: 'escudo', prodA: 'mina', prodB: 'refineria' },
  volt: { d4: 'bobina', d3: 'tesla_aerea', prodB: 'generador', d6: 'escudo', prodA: 'desguace', d2: 'canon_plasma' },
  nuw: { d6: 'nodo', d3: 'colmena', prodB: 'pozo', support: 'escudo', prodC: 'extractor', ult: 'canon' },
};
const ED_NAME = { res: 'Ártica', volt: 'Neón', nuw: 'Tóxica' };
const SEASON = ['tarta','fuegos','estatua_planetas','globos','sombrilla','palmera_luces','fuente_delfin','helados','huevo_pascua','flores_alien','conejo_robot','cesta_huevos','trofeo','bandera_victoria','casco_caido','arco_dorado',
  'calabaza','arbol_tetrico','lapida','caldero','calabaza_alien','espantapajaros','fantasma','caramelos','arbol_navidad','muneco_nieve','regalos','reno_robot','baston_antena','alien_helado','trineo','estrella'];
const FLOORS = { res: ['res_hierba','res_hormigon','res_arena','res_hierba2','res_hierba_seca','res_tierra','res_hormigon2','res_asfalto','res_acero','res_arena2','res_nieve','res_barro'],
  volt: ['volt_metal','volt_circuito','volt_chatarra','volt_metal2','volt_circuito2','volt_hex','volt_chatarra2','volt_aceite','volt_rejilla','volt_marte','volt_lava','volt_hielo'],
  nuw: ['nuw_tierra','nuw_biomasa','nuw_arena_cristal','nuw_biomasa2','nuw_musgo','nuw_limo','nuw_hueso','nuw_cristal','nuw_raices','nuw_coral','nuw_arena_negra','nuw_carne'] };
const LEAGUES = [ { n: 'Bronce', t: 0, k: 'liga_bronce', loot: 0 }, { n: 'Plata', t: 400, k: 'liga_plata', loot: .05 }, { n: 'Oro', t: 1000, k: 'liga_oro', loot: .10 },
  { n: 'Platino', t: 1800, k: 'liga_plata', fl: 'hue-rotate(175deg) saturate(.6) brightness(1.35)', loot: .13 },
  { n: 'Diamante', t: 2800, k: 'liga_diamante', loot: .16 },
  { n: 'Iridiscente', t: 4000, k: 'liga_leyenda', fl: 'drop-shadow(0 0 4px #c27bff)', loot: .20 },
  { n: 'Obsidiana roja', t: 5500, k: 'liga_leyenda', fl: 'grayscale(.6) sepia(1) hue-rotate(-30deg) saturate(4) brightness(.8) contrast(1.3) drop-shadow(0 0 4px #ff2a12)', loot: .25 } ];
const MISSION_POOL = [ { id: 'win', d: 'Gana {n} ataques', n: [2, 3, 4], g: 30 }, { id: 'stars', d: 'Consigue {n} estrellas', n: [4, 6, 8], g: 30 },
  { id: 'destroy', d: 'Destruye {n} edificios enemigos', n: [20, 35, 50], g: 25 }, { id: 'collect', d: 'Recoge {n} recursos', n: [3000, 8000, 20000], g: 20 },
  { id: 'upgrade', d: 'Mejora {n} edificios', n: [2, 3, 4], g: 25 }, { id: 'deploy', d: 'Despliega {n} tropas', n: [20, 40, 60], g: 20 }, { id: 'defend', d: 'Defiende tu base {n} veces', n: [1, 2], g: 25 } ];
const ACHIEVEMENTS = [ { id: 'win', n: 1, d: 'Primera victoria', g: 20 }, { id: 'win', n: 25, d: '25 victorias', g: 60 }, { id: 'win', n: 100, d: '100 victorias', g: 150 },
  { id: 'star3', n: 1, d: 'Primer ataque de 3 estrellas', g: 30 }, { id: 'star3', n: 20, d: '20 ataques de 3 estrellas', g: 100 },
  { id: 'core', n: 5, d: 'Núcleo nivel 5', g: 50 }, { id: 'core', n: 10, d: 'Núcleo nivel 10', g: 200 },
  { id: 'troph', n: 1000, d: 'Llega a liga Oro', g: 80 }, { id: 'troph', n: 3500, d: 'Llega a liga Leyenda', g: 300 },
  { id: 'destroy', n: 500, d: 'Destruye 500 edificios', g: 80 }, { id: 'upgrade', n: 50, d: 'Haz 50 mejoras', g: 80 } ];

// acabados metálicos para tropas (por código, sin imágenes): se desbloquean por liga
const FINISH = [ { n: 'Sin aura', f: '', lg: 0 },
  { n: 'Bronce', f: '', halo: '#d08a4a', lg: 0 },
  { n: 'Plata', f: '', halo: '#9fb0c2', lg: 1 },
  { n: 'Oro', f: '', halo: '#ffcf3a', lg: 2 },
  { n: 'Platino', f: '', halo: '#ffffff', lg: 3 },
  { n: 'Diamante', f: '', halo: '#4fd6ff', fx: 'shine', lg: 4 },
  { n: 'Iridiscente', f: '', halo: 'IRID', fx: 'sparks', lg: 5 },
  { n: 'Obsidiana roja', f: '', halo: '#ff2a12', fx: 'flames', lg: 6 } ];
const haloColor = h => h === 'IRID' ? `hsl(${270 + 30 * Math.sin(performance.now() / 600)},90%,70%)` : h;
const iridFilter = () => { const k = (Math.sin(performance.now() / 700) + 1) / 2; return `grayscale(1) sepia(1) hue-rotate(${248 + k * 14}deg) saturate(${1.7 + k * .4}) brightness(${1.35 + k * .15}) contrast(1.15) drop-shadow(0 0 ${2 + k * 2}px rgba(255,211,77,.55))`; };
