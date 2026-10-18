import { School, StaffMember, Visit, SchoolIssue, MilkProgramType, ModalityType, formatTeamVisitors } from '../types';

const tacuaremboLocalities = [
  { name: 'Tacuarembó (Ciudad)', area: 'Urbana' as const },
  { name: 'Paso de los Toros', area: 'Urbana' as const },
  { name: 'San Gregorio de Polanco', area: 'Urbana' as const },
  { name: 'Villa Ansina', area: 'Rural' as const },
  { name: 'Curtina', area: 'Rural' as const },
  { name: 'Caraguatá / Las Toscas', area: 'Rural' as const },
  { name: 'Tambores', area: 'Rural' as const },
  { name: 'Peralta', area: 'Rural' as const },
  { name: 'Paso del Cerro', area: 'Rural' as const },
  { name: 'Puntas de Cinco Sauces', area: 'Rural' as const },
  { name: 'Rincón del Bonete', area: 'Urbana' as const },
  { name: 'Achar', area: 'Rural' as const },
  { name: 'Cuchilla de Peralta', area: 'Rural' as const },
  { name: 'Sauce de Batoví', area: 'Rural' as const },
  { name: 'La Hilera', area: 'Rural' as const },
  { name: 'Clara', area: 'Rural' as const }
];

const inspectors = [
  'Insp. Mtra. María del Carmen López (Zona Urbana Tacuarembó)',
  'Insp. Mtra. Sandra Pereira (Zona Paso de los Toros)',
  'Insp. Mtro. Wilson Netto (Zona Rural Este - Caraguatá / Ansina)',
  'Insp. Mtra. Virginia Da Silva (Zona Rural Centro y Sur)',
  'Insp. Mtra. Ana Laura Techera (Zona Rural Oeste y Tambores)'
];

const schoolNames = [
  'General José Gervasio Artigas', 'República de Chile', 'Dámaso Antonio Larrañaga', 'Enriqueta Compte y Riqué',
  'José Pedro Varela', 'República Argentina', 'Constancio C. Vigil', 'Dr. Juan Zorrilla de San Martín',
  'Juana de Ibarbourou', 'República del Brasil', 'Carlos Vaz Ferreira', 'Petrona Viera',
  'Delia Simpson', 'María Stagnero de Munar', 'Francia', 'Gran Bretaña',
  'República de Italia', 'República de México', 'República del Paraguay', 'República de Colombia',
  'Clemente Estable', 'España', 'Estados Unidos', 'República de Cuba',
  'Maestro Julio Castro', 'Eduardo Fabini', 'Florencio Sánchez', 'Joaquín Torres García'
];

export function generateInitial140Schools(): {
  schools: School[];
  staff: StaffMember[];
  visits: Visit[];
  issues: SchoolIssue[];
} {
  const schools: School[] = [];
  const staff: StaffMember[] = [];
  const visits: Visit[] = [];
  const issues: SchoolIssue[] = [];

  for (let i = 1; i <= 140; i++) {
    const schoolId = `esc-${i}`;
    const loc = tacuaremboLocalities[(i - 1) % tacuaremboLocalities.length];
    const isRural = i % 2 !== 0 || i > 30; // Good mix of rural and urbana schools typical of Tacuarembó
    const areaType = isRural ? 'Rural' : 'Urbana';
    
    let modality: ModalityType = 'Común';
    if (isRural) {
      if (i === 35 || i === 75) {
        modality = 'TPA';
      } else if (i % 7 === 0) {
        modality = 'Aprender';
      } else {
        modality = 'Rural';
      }
    } else {
      if (i === 2 || i === 8 || i === 14 || i === 20 || i === 28) {
        modality = 'Tiempo Completo';
      } else if (i === 4 || i === 10 || i === 16) {
        modality = 'Tiempo Extendido';
      } else if (i === 6 || i === 24 || i === 124) {
        modality = 'Escuelas de Educación Especial';
      } else if (i === 12 || i === 30) {
        modality = 'Escuelas de Educación Artística (EDEA)';
      } else if (i === 18 || i === 22) {
        modality = 'TPA';
      } else if (i === 26) {
        modality = 'Práctica';
      } else if (i % 3 === 0) {
        modality = 'Aprender';
      } else {
        modality = 'Común';
      }
    }

    const baseName = schoolNames[(i - 1) % schoolNames.length];
    let name = `N° ${i} "${baseName}" - ${loc.name}`;
    if (modality === 'Escuelas de Educación Especial') {
      name = `N° ${i} "Escuela Especial" - ${loc.name}`;
    } else if (modality === 'Escuelas de Educación Artística (EDEA)') {
      name = `N° ${i} "Escuela de Educación Artística (EDEA)" - ${loc.name}`;
    } else if (modality === 'TPA') {
      name = `N° ${i} "TPA (Talleres de Producción y Aprendizaje)" - ${loc.name}`;
    }
    const assignedInspector = inspectors[(i - 1) % inspectors.length];

    // Water supply & Water Purchase Allowance (especialmente común en escuelas rurales de Tacuarembó)
    const hasWaterSupply = !isRural || (i % 3 !== 0);
    const waterPurchaseAllowance = !hasWaterSupply;
    const waterNotes = waterPurchaseAllowance 
      ? `Escuela rural sin conexión a red de OSE. Recibe rubro de PAE/DGEIP para compra de agua potable (bidones de 20L y recarga de tanque de cocina/comedor).` 
      : `Conexión a red OSE regular con control de cloro en cocina.`;

    // Milk Powder & Milk Program
    const milkProgramType: MilkProgramType = (i % 3 === 0) 
      ? 'Programa de Copa de Leche' 
      : (i % 4 === 0) 
        ? 'Programa de Leche Escolar' 
        : (i % 5 === 0) 
          ? 'Ambos' 
          : 'Ninguno / Comedor Tradicional';

    const studentCount = isRural ? (12 + ((i * 7) % 45)) : (95 + ((i * 19) % 240));
    const staffCount = isRural ? 2 + (i % 3) : 6 + (i % 6);
    const milkPowderKg = isRural ? (8 + (i % 15)) : (25 + ((i * 4) % 40));

    let totalVisits = 0;
    let lastVisitDate: string | undefined = undefined;
    let activeIssuesCount = 0;

    // Generate staff for schools
    if (i <= 35 || i % 3 === 0) {
      const staffQty = isRural ? 2 : (2 + (i % 3));
      for (let s = 1; s <= staffQty; s++) {
        const staffId = `staff-${i}-${s}`;
        const isDgeip = s === 1;
        const institutionType = isDgeip ? 'DGEIP' : (s % 2 === 0 ? 'Comisión Fomento' : 'Empresa Tercerizada');
        const enterpriseName = institutionType === 'Empresa Tercerizada' ? 'Servicios Gastronómicos del Norte S.R.L.' : undefined;

        let healthCardValidUntil = '2026-11-20';
        if (i === 2 && s === 1) healthCardValidUntil = '2026-08-15'; // Vencido
        else if (i === 5 && s === 2) healthCardValidUntil = '2026-10-05'; // Por vencer
        else if (i === 13 && s === 1) healthCardValidUntil = '2026-07-30'; // Vencido

        staff.push({
          id: staffId,
          schoolId,
          fullName: s === 1 
            ? `María Teresa Da Silva (${s})` 
            : s === 2 
              ? `Ana Elizabeth Suárez (${s})` 
              : `Lourdes Beatriz Cuadrado (${s})`,
          ci: `4.${(120 + i * 7).toString().padStart(3, '0')}.${(450 + s * 13).toString().padStart(3, '0')}-${(i + s) % 10}`,
          role: s === 1 ? 'Cocinera Titular' : s === 2 ? 'Auxiliar de Cocina' : 'Ayudante de Cocina',
          institutionType,
          enterpriseName,
          healthCardValidUntil,
          foodHandlerCardValidUntil: '2027-04-10',
          socialSecurityStatus: (i === 8 && s === 2) ? 'Pendiente de Regularización' : 'Al día / Registrado',
          phone: `098 ${100 + i} ${200 + s}`,
          notes: s === 1 ? 'Cocinera responsable del turno principal y elaboración de preparaciones calientes.' : 'Auxiliar en preparación previa, corte de hortalizas y sanitización.',
          active: true
        });
      }
    }

    // Generate visits and issues for selected schools with official Tacuarembó devolution fields!
    if (i <= 25 || i % 4 === 0) {
      const visitQty = 1 + (i % 3);
      totalVisits = visitQty;

      for (let v = 1; v <= visitQty; v++) {
        const visitId = `vis-${i}-${v}`;
        const day = 8 + ((i + v * 3) % 20);
        const month = v === 1 ? '06' : v === 2 ? '08' : '09';
        const visitDate = `2026-${month}-${day.toString().padStart(2, '0')}`;
        lastVisitDate = visitDate;

        const hasUnauthorized = (i === 3 && v === visitQty) || (i === 7 && v === 1) || (i === 14 && v === visitQty);
        const unauthItems = hasUnauthorized ? [
          {
            id: `unauth-${i}-${v}-1`,
            item: i === 3 ? 'Salchichas y fiambre mortadela' : i === 7 ? 'Jugos en polvo con azúcar y colorantes' : 'Aderezos en sachet no autorizados',
            category: (i === 3 ? 'Fiambres/Embutidos' : i === 7 ? 'Bebidas Azucaradas' : 'Aderezos no autorizados') as any,
            reason: 'Alimento de compra no autorizada según pág. 80 del recetario "Los Nuevos Sabores de mi Escuela" y pág. 71 de "Las delicias de mi Escuela".',
            actionTaken: 'Se notifica de inmediato a la Dirección. Se retira del depósito y se deja asentado en la planilla de registros.'
          }
        ] : [];

        const visitorCombos = [
          ['valentina', 'shaja'],
          ['valentina', 'karina'],
          ['shaja', 'karina'],
          ['valentina', 'laura'],
          ['valentina', 'shaja', 'karina'],
          ['valentina', 'shaja', 'karina', 'laura'],
          ['valentina']
        ];
        const selectedVisitors = visitorCombos[(i + v) % visitorCombos.length];
        const teamInfo = formatTeamVisitors(selectedVisitors);

        // Mark 2 realistic rural school visits as pending sync captured offline (e.g. Caraguatá and Paso del Cerro)
        const isOfflineCaptured = (i === 35 && v === visitQty) || (i === 17 && v === visitQty);

        visits.push({
          id: visitId,
          schoolId,
          visitNumber: v,
          date: visitDate,
          time: v % 2 === 0 ? '11:15' : '10:30',
          status: 'Realizada',
          isOfflinePendingSync: isOfflineCaptured,
          offlineSavedAt: isOfflineCaptured ? '2026-09-24T07:45:00.000Z' : undefined,
          visitors: selectedVisitors,
          inspectorName: teamInfo.inspectorName,
          inspectorRole: teamInfo.inspectorRole,
          nutritionistName: teamInfo.nutritionistName,
          assignedSchoolInspector: assignedInspector,
          attendedBy: `Mtra. Directora Silvia Viera y Auxiliar María Teresa`,
          
          // Apartado previo de observaciones de campo
          initialFieldObservations: `Visita realizada en conjunto con el equipo docente. Se observa buena dinámica de ingreso al comedor y correcta higiene de manos previa de los alumnos. Las auxiliares se encontraban con el servicio en marcha cumpliendo los tiempos estipulados.`,

          menuPlanned: 'Cazuela de lentejas con carne magra vacuna, zapallo, zanahoria y arroz + Manzana',
          menuServed: 'Cazuela de lentejas con carne vacuna, arroz y vegetales + Fruta fresca de estación',
          menuEvaluation: 'Adecuado y Variado',
          dinersActualCount: studentCount - (isRural ? 1 : 12),
          actualAdultsCount: staffCount,

          // Auxiliares
          staffHygieneNotes: 'Auxiliares con uniforme completo reglamentario, cofias cubriendo la totalidad del cabello, sin alhajas visibles ni esmalte de uñas. Carnés de salud y de manipulación de alimentos vigentes y a la vista.',

          // Higiene
          facilityHygieneNotes: 'Condiciones edilicias de cocina y comedor en buen estado general. Mesadas y piletas de acero inoxidable limpias y desinfectadas. Comedor ventilado e iluminado.',
          hygieneChecklist: {
            coldChain: (i === 6 && v === 1) ? 'Deficiente' : 'Bien',
            rawCookedSeparation: 'Bien',
            cleanliness: 'Bien',
            uniformAndCaps: 'Bien',
            potableWaterChlorine: hasWaterSupply ? 'Bien' : 'Regular',
            wasteDisposal: 'Bien'
          },

          // Almacenamiento
          storageNotes: hasUnauthorized 
            ? 'Despensa seca ordenada, tarimas elevadas del suelo. Se constató presencia de alimentos no autorizados en estantería auxiliar.' 
            : 'Despensa seca y cámara frigorífica con excelente orden y rotación de stock. Envases herméticos rotulados con fecha de fraccionamiento. Sin alimentos de compra no autorizada.',

          // Servicio
          serviceNotes: 'Horarios de almuerzo cumplidos con puntualidad. Excelente conducta de los comensales y fomento de hábitos saludables. Temperatura del plato principal adecuada (superior a 65°C). Docente presente acompañando el comedor. Mesas completas: plato principal, jarra de agua potable, pan, postre, servilletas y cubiertos acordes a la preparación.',

          // Equipamiento y menage
          equipmentNotes: isRural 
            ? 'Cuentan con heladera y cocina a gas en correcto funcionamiento. Se solicita reposición de 10 platos hondos y una asadera de horno.' 
            : 'Equipamiento completo en buen estado. Menage suficiente para la totalidad de la matrícula.',

          // Proveedores
          providersNotes: 'Distribuidor local de carnes y verduras de Tacuarembó entrega según cronograma semanal acordado. Remitos firmados al recibir mercadería.',

          // Menú del día
          lunchMenu: 'Cazuela de lentejas y carne magra con arroz y hortalizas mixtas + Manzana fresca.',
          breakfastOrSnackMenu: 'Leche tibia enriquecida con pan con dulce de membrillo casero autorizado.',

          // Menú de la semana
          weeklyMenuDates: '15/09 al 19/09',
          weeklyMenuMonday: 'Milanesas de carne al horno con puré mixto de calabaza y papa + Naranja',
          weeklyMenuTuesday: 'Pastel de carne con base de puré y hortalizas + Banana',
          weeklyMenuWednesday: 'Cazuela de lentejas y vegetales con arroz + Manzana',
          weeklyMenuThursday: 'Pollo al horno con ensalada de zanahoria rallada, remolacha y choclo + Mandarina',
          weeklyMenuFriday: 'Torta de verduras con queso magro y arroz primavera + Ensalada de frutas',

          recipeCompliance: 'Se cumple cabalmente con las pautas de los recetarios oficiales del PAE ("Los Nuevos Sabores de mi Escuela" y "Las delicias de mi Escuela") y la planificación acordada.',
          foodVariabilityAndDesserts: 'Excelente variabilidad y frecuencia semanal de legumbres, carnes magras y hortalizas de diversos colores. Fruta fresca diaria como postre principal.',
          menuVariabilitySuggestions: 'Continuar alternando la presentación de los vegetales cocidos y crudos para sostener el interés y aceptación de los niños.',

          // Registros
          monthlySheetsSentToEmail: 'Sí, se envía Planilla de Registro Diario de Menú y boletas de manera mensual al correo paetacuarembo@gmail.com en tiempo y forma.',
          kitchenLogbooksInOrder: 'Sí, cuadernos de registro diario y de remitos en cocina presentes, completos, en buen estado y al día, conforme al Art. 14 de la Circular N°6 del 23 de Febrero del 2024.',
          recordsNotes: 'Planillas completas con firma de dirección y auxiliares. Coinciden los comensales declarados con las raciones elaboradas.',
          deliveryNotesChecked: true,
          deliveryNotesDetails: `Remito Nº 00${120 + i}-Tbo cotejado en el acto. Fechas de faena y vencimiento verificadas.`,

          unauthorizedPurchasesInRecords: hasUnauthorized 
            ? 'Se observó en boleta del mes anterior compra de embutidos no habilitados (ver pág. 80 recetario). Se rectificó criterio con la comisión.' 
            : 'No se registran compras no autorizadas en boletas ni remitos analizados.',
          unauthorizedItemsFound: hasUnauthorized,
          unauthorizedItemsList: unauthItems,

          // Meriendas y cantina
          snackAndBreakfastRecorded: 'Sí, se asienta diariamente el registro de desayunos y meriendas escolares.',
          healthySnackNotes: 'Se promueven frutas de estación, lácteos y panificados con bajo contenido de azúcares y grasas.',
          schoolCanteenNotes: isRural ? 'No dispone de cantina comercial. Todo el consumo se rige por el servicio PAE.' : 'Cantina escolar cumple con la Ley N° 19.140 de alimentación saludable.',
          homeSnackNotes: 'Se estimula a las familias mediante talleres a enviar colaciones saludables (frutas, agua, cereales sin azúcar).',

          // Menúes especiales
          specialMenusNotes: (i % 6 === 0) 
            ? 'Se cuenta con 1 menú celíaco (libre de gluten) debidamente respaldado con Certificado médico y Acta correspondiente de la pág. 14 de la Circular N°6/2024. Alimentos almacenados en contenedor exclusivo e identificados.' 
            : 'No se registran alumnos con requerimientos de menú especial por patología a la fecha.',

          // Personal y cierre
          staffFeedbackNotes: 'El personal auxiliar manifiesta conformidad con los insumos recibidos y agradece la orientación bromatológica brindada.',
          meetingMinutes: 'Se dialogó con la Directora y auxiliares sobre las orientaciones del menú, la importancia del agua potable y el envío mensual a paetacuarembo@gmail.com.',
          suggestions: '1. Mantener las mesas completas con jarras de agua potable fresca.\n2. Archivar remitos cronológicamente junto a la planilla de menú.',
          generalObservations: 'Servicio de comedor funcionando con alto compromiso institucional y adecuadas normas higiénico-sanitarias.',
          issuesFollowUpSummary: v > 1 ? 'Se verificó el cumplimiento de las recomendaciones emitidas en la visita precedente.' : undefined
        });

        if (hasUnauthorized) {
          const isResolved = v < visitQty;
          if (!isResolved) activeIssuesCount++;
          issues.push({
            id: `iss-${i}-${v}-unauth`,
            schoolId,
            visitId,
            title: `Alimento no autorizado: ${unauthItems[0].item}`,
            description: `Se constató en remito/depósito de Escuela N° ${i}. Infracción a pág. 80 "Los Nuevos Sabores" / pág. 71 "Las delicias de mi Escuela".`,
            category: 'Alimentos no autorizados',
            severity: 'Crítica',
            reportedDate: visitDate,
            status: isResolved ? 'Resuelto' : 'Pendiente',
            resolvedDate: isResolved ? '2026-09-10' : undefined,
            resolutionNotes: isResolved ? 'En visita de seguimiento de Ecónomas se verificó el cese de compra y retiro del producto.' : undefined,
            resolvedInVisitNumber: isResolved ? v + 1 : undefined
          });
        }
      }
    }

    schools.push({
      id: schoolId,
      number: i,
      name,
      department: 'Tacuarembó',
      areaType,
      zone: loc.name,
      assignedInspector,
      address: isRural ? `Ruta Nacional / Paraje ${loc.name}, km ${120 + (i * 3) % 200}` : `Calle Artigas ${500 + i * 15} esq. 18 de Julio`,
      phone: `4632 ${1000 + (i * 19) % 8000}`,
      email: `escuela${i}@dgeip.edu.uy`,
      principalName: `Mtra. ${['Silvia Viera', 'Laura Cabrera', 'Beatriz Gómez', 'María José Fernández', 'Graciela Ramos', 'Patricia Da Silva'][(i - 1) % 6]}`,
      headCookName: `Sra. ${['María Teresa Da Silva', 'Rosa Martínez', 'Nélida Ferreira', 'Carmen Pintado', 'Gloria Méndez', 'Sonia Alvez'][(i - 1) % 6]}`,
      modality,
      studentDinersCount: studentCount,
      staffDinersCount: staffCount,
      mealServices: {
        breakfast: true,
        lunch: true,
        snack: modality === 'Tiempo Completo' || modality === 'Tiempo Extendido' || modality === 'TPA' || modality === 'Escuelas de Educación Especial' || isRural
      },
      hasWaterSupply,
      waterPurchaseAllowance,
      waterNotes,
      milkProgramType,
      milkPowderKg,
      milkNotes: `Cuota de leche en polvo distribuida: ${milkPowderKg} kg/mes. Destinada a copas de leche, desayunos y meriendas.`,
      notes: isRural 
        ? (waterPurchaseAllowance 
            ? `Escuela Rural Tacuarembó. Recibe rubro especial para compra de agua potable. Pertenece al ${milkProgramType}.` 
            : `Escuela Rural con agua de pozo/aljibe clorada. Pertenece al ${milkProgramType}.`)
        : `Escuela Urbana Tacuarembó. Conexión de red OSE. Comedor escolar consolidado.`,
      lastVisitDate,
      totalVisits,
      activeIssuesCount
    });
  }

  // Scheduled fieldwork itinerary visits (for late September and October 2026)
  const scheduledData = [
    {
      schoolNum: 12,
      date: '2026-09-24',
      time: '10:00',
      objective: 'Relevamiento de compra y almacenamiento de agua potable con rubro PAE',
      circuit: 'Circuito Ruta 5 Norte (Curtina)'
    },
    {
      schoolNum: 18,
      date: '2026-09-24',
      time: '12:30',
      objective: 'Supervisión del servicio de almuerzo y mesas completas',
      circuit: 'Circuito Ruta 5 Norte (Curtina)'
    },
    {
      schoolNum: 27,
      date: '2026-09-25',
      time: '10:30',
      objective: 'Cotejo de remitos de carne y verduras e inspección de carnés de auxiliares',
      circuit: 'Circuito Tacuarembó Capital (Urbana)'
    },
    {
      schoolNum: 31,
      date: '2026-09-28',
      time: '10:15',
      objective: 'Control de higiene bromatológica y cuota mensual de leche en polvo',
      circuit: 'Circuito Ruta 26 Este (Caraguatá)'
    },
    {
      schoolNum: 33,
      date: '2026-09-28',
      time: '12:15',
      objective: 'Evaluación del menú del día y condiciones del aljibe clorado',
      circuit: 'Circuito Ruta 26 Este (Caraguatá)'
    },
    {
      schoolNum: 42,
      date: '2026-09-29',
      time: '11:00',
      objective: 'Auditoría de planilla de registros (Circular N°6/2024 Art. 14)',
      circuit: 'Circuito Tacuarembó Capital (Urbana)'
    },
    {
      schoolNum: 48,
      date: '2026-09-30',
      time: '10:45',
      objective: 'Seguimiento de equipamiento de cocina y menage recibido',
      circuit: 'Circuito Paso de los Toros'
    },
    {
      schoolNum: 54,
      date: '2026-10-02',
      time: '10:30',
      objective: 'Supervisión de inocuidad y control de proveedores locales',
      circuit: 'Circuito San Gregorio de Polanco'
    },
    {
      schoolNum: 62,
      date: '2026-10-05',
      time: '11:15',
      objective: 'Relevamiento de menú especial celíaco con certificado médico',
      circuit: 'Circuito Tacuarembó Capital (Urbana)'
    },
    {
      schoolNum: 71,
      date: '2026-10-08',
      time: '10:00',
      objective: 'Inspección de almacenamiento en frío y fechas de vencimiento',
      circuit: 'Circuito Ruta 31 (Sauce de Batoví)'
    },
    {
      schoolNum: 85,
      date: '2026-10-14',
      time: '10:30',
      objective: 'Cotejo de remitos y verificación de libreta de agua',
      circuit: 'Circuito Ruta 26 Este (Ansina)'
    }
  ];

  scheduledData.forEach((item, idx) => {
    const sc = schools.find(s => s.number === item.schoolNum);
    if (sc) {
      const scheduledCombos = [
        ['valentina', 'shaja'],
        ['valentina', 'karina'],
        ['shaja', 'karina'],
        ['valentina', 'laura'],
        ['valentina', 'shaja', 'karina', 'laura'],
        ['karina', 'laura']
      ];
      const selectedVisitors = scheduledCombos[idx % scheduledCombos.length];
      const teamInfo = formatTeamVisitors(selectedVisitors);

      visits.push({
        id: `vis-sched-seed-${idx + 1}`,
        schoolId: sc.id,
        visitNumber: sc.totalVisits + 1,
        date: item.date,
        time: item.time,
        status: 'Programada',
        scheduledObjective: item.objective,
        itineraryNotes: item.circuit,
        visitors: selectedVisitors,
        inspectorName: teamInfo.inspectorName,
        inspectorRole: teamInfo.inspectorRole,
        nutritionistName: teamInfo.nutritionistName,
        assignedSchoolInspector: sc.assignedInspector,
        attendedBy: `Maestro/a Director/a ${sc.principalName}`,
        menuPlanned: 'Planificación según recetario oficial PAE',
        menuServed: 'A verificar en el día de la visita',
        menuEvaluation: 'Adecuado y Variado',
        dinersActualCount: sc.studentDinersCount,
        actualAdultsCount: sc.staffDinersCount || 3,
        hygieneChecklist: {
          coldChain: 'Bien',
          rawCookedSeparation: 'Bien',
          cleanliness: 'Bien',
          uniformAndCaps: 'Bien',
          potableWaterChlorine: sc.hasWaterSupply ? 'Bien' : 'Regular',
          wasteDisposal: 'Bien'
        },
        deliveryNotesChecked: false,
        deliveryNotesDetails: 'Cotejo previsto en instancia de campo',
        unauthorizedItemsFound: false,
        unauthorizedItemsList: [],
        meetingMinutes: '',
        suggestions: '',
        generalObservations: `Visita programada en itinerario de campo. Objetivo: ${item.objective}`
      });
    }
  });

  return { schools, staff, visits, issues };
}
