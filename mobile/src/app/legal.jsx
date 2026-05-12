import React, { useState, useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { T } from "../theme";

const TABS = [
  { key: "privacidad", label: "Privacidad" },
  { key: "terminos", label: "Términos" },
  { key: "aviso", label: "Aviso Legal" },
];

const DOCS = {
  aviso: {
    title: "Aviso Legal",
    date: "Última actualización: 22 de abril de 2025",
    intro: null,
    sections: [
      {
        title: "1. Datos identificativos del titular",
        body: "En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSICE), se ponen a disposición del usuario los siguientes datos identificativos:\n\nTitular: Luis Moreno Villar\nNIF: 79035115P\nDomicilio: Camino Coín 29, Málaga, España\nCorreo electrónico: techslumo@gmail.com",
      },
      {
        title: "2. Objeto y ámbito de aplicación",
        body: "El presente Aviso Legal regula el acceso y uso de la aplicación móvil Escandallos (en adelante, \"la Aplicación\"), disponible para dispositivos iOS y Android, cuya finalidad es ofrecer a los profesionales de la restauración un software de gestión de escandallos (fichas técnicas, costes y rentabilidad de platos).\n\nEl acceso y uso de la Aplicación implica la aceptación plena y sin reservas de las presentes condiciones. El titular se reserva el derecho a modificar, en cualquier momento y sin previo aviso, las presentes condiciones, así como los contenidos y servicios ofrecidos.",
      },
      {
        title: "3. Propiedad intelectual e industrial",
        body: "Todos los contenidos de la Aplicación —incluyendo, pero no limitándose a, el código fuente, diseño, logotipos, textos, imágenes y funcionalidades— son titularidad exclusiva de Luis Moreno Villar o de sus licenciantes, y están protegidos por la legislación española e internacional sobre propiedad intelectual e industrial.\n\nQueda expresamente prohibida la reproducción, distribución, comunicación pública, transformación o cualquier otra forma de explotación de los contenidos de la Aplicación sin autorización previa y por escrito del titular.",
      },
      {
        title: "4. Condiciones de uso",
        body: "El usuario se compromete a:\n\n· Hacer un uso lícito de la Aplicación y conforme a la normativa vigente.\n· No intentar acceder a áreas restringidas o manipular el sistema de manera no autorizada.\n· No introducir datos falsos, incorrectos o de terceros sin su consentimiento.\n· No utilizar la Aplicación con fines fraudulentos, ilegales o que puedan causar daño a terceros.",
      },
      {
        title: "5. Exclusión de responsabilidad",
        body: "El titular no garantiza la disponibilidad continua e ininterrumpida de la Aplicación, ni se responsabiliza de los daños o perjuicios causados por interrupciones, fallos técnicos o indisponibilidades del servicio ajenas a su voluntad.\n\nAsimismo, el titular no será responsable del uso que el usuario haga de los datos y resultados obtenidos mediante la Aplicación, que tienen carácter meramente informativo y de apoyo a la gestión.",
      },
      {
        title: "6. Servicios de terceros",
        body: "La Aplicación hace uso de los siguientes servicios prestados por terceros, sujetos a sus propias políticas y condiciones:\n\n· Supabase (base de datos y autenticación): supabase.com\n· Vercel (infraestructura de despliegue): vercel.com\n· Anthropic / Claude (inteligencia artificial): anthropic.com\n· Stripe (procesamiento de pagos): stripe.com\n\nEl titular no se hace responsable de las prácticas de privacidad o condiciones de dichos terceros.",
      },
      {
        title: "7. Legislación aplicable y jurisdicción",
        body: "El presente Aviso Legal se rige en todos y cada uno de sus extremos por la legislación española. Para la resolución de cualquier controversia derivada del uso de la Aplicación, las partes se someten a los Juzgados y Tribunales de Málaga, salvo que la normativa de consumidores y usuarios establezca otro fuero imperativo.",
      },
    ],
  },

  privacidad: {
    title: "Política de Privacidad",
    date: "Última actualización: 22 de abril de 2025",
    intro: null,
    sections: [
      {
        title: "1. Responsable del tratamiento",
        body: "De conformidad con el Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD), el responsable del tratamiento es:\n\nNombre: Luis Moreno Villar\nNIF: 79035115P\nDomicilio: Camino Coín 29, Málaga, España\nCorreo electrónico: techslumo@gmail.com",
      },
      {
        title: "2. Datos personales que se recaban",
        body: "A través de la Aplicación Escandallos se tratan las siguientes categorías de datos personales:\n\n· Datos de identificación y contacto: nombre y apellidos, dirección de correo electrónico.\n· Datos de facturación: nombre o razón social, NIF/CIF y dirección fiscal.\n· Datos técnicos: información de inicio de sesión, registros de uso (logs) y datos del dispositivo, gestionados a través de Supabase y Vercel.",
      },
      {
        title: "3. Finalidades y bases jurídicas del tratamiento",
        body: "Los datos se tratan para las siguientes finalidades:\n\n· Gestión del alta, autenticación y mantenimiento de la cuenta de usuario (art. 6.1.b RGPD).\n· Prestación de los servicios de la Aplicación, incluyendo el cálculo y gestión de escandallos (art. 6.1.b RGPD).\n· Gestión de la facturación y cobros a través de Stripe (art. 6.1.b y 6.1.c RGPD).\n· Mejora del servicio mediante el análisis de datos de uso (art. 6.1.f RGPD).\n· Comunicaciones relacionadas con el servicio (art. 6.1.b RGPD).",
      },
      {
        title: "4. Conservación de los datos",
        body: "Los datos personales se conservarán durante el tiempo estrictamente necesario:\n\n· Datos de cuenta (nombre y email): durante la vigencia de la relación contractual y 30 días adicionales tras la cancelación.\n· Datos de facturación: 5 años desde la emisión (art. 30 Código de Comercio) y 4 años por obligaciones tributarias.\n· Datos técnicos y logs de uso: máximo 12 meses desde su generación.\n\nTranscurridos los plazos indicados, los datos serán eliminados o anonimizados de forma segura.",
      },
      {
        title: "5. Destinatarios y transferencias internacionales",
        body: "Los datos podrán ser comunicados a los siguientes encargados del tratamiento:\n\n· Supabase Inc. (EE.UU.): base de datos y autenticación. Cláusulas contractuales tipo UE.\n· Vercel Inc. (EE.UU.): alojamiento y despliegue. Cláusulas contractuales tipo UE.\n· Anthropic PBC (EE.UU.): inteligencia artificial (Claude). Cláusulas contractuales tipo UE.\n· Stripe Inc. (EE.UU.): procesamiento de pagos. EU-U.S. Data Privacy Framework.\n\nNo se realizarán cesiones de datos a terceros ajenos a la prestación del servicio, salvo obligación legal.",
      },
      {
        title: "6. Derechos de los usuarios",
        body: "El usuario puede ejercer en cualquier momento los siguientes derechos reconocidos por el RGPD:\n\n· Derecho de acceso: conocer qué datos personales se tratan.\n· Derecho de rectificación: solicitar la corrección de datos inexactos.\n· Derecho de supresión (\"derecho al olvido\"): solicitar la eliminación de datos.\n· Derecho a la limitación del tratamiento.\n· Derecho a la portabilidad de los datos.\n· Derecho de oposición al tratamiento.\n\nPara ejercer estos derechos: techslumo@gmail.com, adjuntando copia del DNI. También puede reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).",
      },
      {
        title: "7. Seguridad de los datos",
        body: "El titular aplica medidas técnicas y organizativas adecuadas para garantizar un nivel de seguridad apropiado al riesgo, incluyendo el cifrado de datos en tránsito y en reposo, el control de accesos y la realización periódica de copias de seguridad.",
      },
      {
        title: "8. Menores de edad",
        body: "La Aplicación Escandallos está dirigida exclusivamente a profesionales mayores de 18 años del sector de la restauración. No se recaban de forma consciente datos personales de menores de edad. Si se detectara que un menor ha facilitado datos sin consentimiento parental, se procederá a su eliminación inmediata.",
      },
      {
        title: "9. Modificaciones de la política de privacidad",
        body: "El titular se reserva el derecho a modificar la presente Política de Privacidad para adaptarla a novedades legislativas o cambios en los servicios ofrecidos. Los cambios relevantes serán notificados a los usuarios a través de la Aplicación o por correo electrónico con antelación suficiente.",
      },
      {
        title: "10. Legislación aplicable",
        body: "La presente Política de Privacidad se rige por el Reglamento (UE) 2016/679 (RGPD), la Ley Orgánica 3/2018 (LOPDGDD) y demás normativa española aplicable en materia de protección de datos.",
      },
    ],
  },

  terminos: {
    title: "Términos y Condiciones de Uso",
    date: "Última actualización: 22 de abril de 2025",
    intro: "Los presentes Términos y Condiciones regulan el acceso y uso de la aplicación móvil Escandallos, titularidad de Luis Moreno Villar (NIF: 79035115P), Camino Coín 29, Málaga — techslumo@gmail.com. El acceso o uso de la Aplicación implica la aceptación plena y sin reservas de los presentes Términos.",
    sections: [
      {
        title: "1. Descripción del servicio",
        body: "Escandallos es una plataforma SaaS de gestión de escandallos destinada a profesionales del sector de la restauración. Permite crear y gestionar fichas técnicas de platos, calcular costes y márgenes, y optimizar la rentabilidad de las cartas.\n\nEl Servicio hace uso de tecnologías de inteligencia artificial proporcionadas por Anthropic (Claude) para determinadas funcionalidades. El titular se reserva el derecho a modificar, ampliar, reducir o cesar las funcionalidades del Servicio en cualquier momento, notificándolo con antelación razonable.",
      },
      {
        title: "2. Registro y cuenta de usuario",
        body: "Para acceder al Servicio es necesario crear una cuenta proporcionando nombre, correo electrónico y contraseña. El usuario es responsable de mantener la confidencialidad de sus credenciales y de todas las actividades realizadas bajo su cuenta.\n\nEl usuario se compromete a facilitar información veraz, completa y actualizada. En caso de uso no autorizado de su cuenta, deberá notificarlo de inmediato a techslumo@gmail.com.",
      },
      {
        title: "3. Planes, precios y facturación",
        body: "El Servicio se ofrece bajo planes de suscripción con precios indicados sin IVA. Los precios podrán ser modificados notificando al usuario con al menos 30 días de antelación.\n\nEl cobro se realiza de forma recurrente al inicio de cada período de suscripción a través de Stripe. El usuario autoriza expresamente el cargo automático en el método de pago registrado. El titular emitirá factura por cada cobro efectuado, remitida al correo electrónico del usuario.",
      },
      {
        title: "4. Política de reembolsos",
        body: "Dado que Escandallos es un servicio digital de acceso inmediato, y de conformidad con el artículo 103.a) del Real Decreto Legislativo 1/2007, el usuario reconoce que, al iniciar el uso del Servicio, renuncia a su derecho de desistimiento de 14 días.\n\nNo se realizarán reembolsos una vez efectuado el primer cobro. Si el usuario cancela su suscripción, conservará acceso al Servicio hasta el final del período de facturación en curso, sin derecho a devolución proporcional.\n\nExcepcionalmente, el titular podrá valorar solicitudes de reembolso por error técnico imputable al Servicio. Estas solicitudes deberán remitirse a techslumo@gmail.com en un plazo máximo de 7 días desde la incidencia.",
      },
      {
        title: "5. Política de cancelación",
        body: "El usuario puede cancelar su suscripción en cualquier momento desde la configuración de su cuenta o enviando un correo a techslumo@gmail.com. La cancelación tendrá efecto al final del período de facturación en curso.\n\nUna vez finalizado el período, la cuenta pasará a estado inactivo y los datos del usuario se conservarán durante 30 días adicionales, transcurridos los cuales podrán ser eliminados definitivamente.\n\nEl titular se reserva el derecho a suspender o cancelar unilateralmente la cuenta de un usuario en caso de incumplimiento de los presentes Términos.",
      },
      {
        title: "6. Cláusula de uso aceptable",
        body: "El usuario se compromete a hacer un uso del Servicio conforme a la ley y en particular se obliga a:\n\n· No utilizar el Servicio para fines ilegales o fraudulentos.\n· No intentar acceder, modificar o dañar los sistemas vinculados al Servicio.\n· No introducir virus u otro código malicioso.\n· No realizar ingeniería inversa ni descompilar el software.\n· No revender ni sublicenciar el Servicio sin autorización expresa.\n· No suplantar la identidad de otros usuarios o del titular.\n· No introducir datos de terceros sin su consentimiento.",
      },
      {
        title: "7. Propiedad intelectual",
        body: "Todos los derechos de propiedad intelectual e industrial sobre el Servicio son titularidad exclusiva de Luis Moreno Villar o de sus licenciantes. La contratación otorga al usuario una licencia personal, no exclusiva, intransferible y revocable para usar la Aplicación exclusivamente para sus fines profesionales internos.\n\nLos contenidos introducidos por el usuario en la Aplicación son de su exclusiva propiedad. El titular únicamente los tratará en los términos descritos en la Política de Privacidad.",
      },
      {
        title: "8. Limitación de responsabilidad",
        body: "El Servicio se presta \"tal cual\" y \"según disponibilidad\". El titular no garantiza que el Servicio sea ininterrumpido o libre de errores.\n\nEn la máxima medida permitida por la legislación española, el titular no será responsable de daños indirectos, pérdida de datos, beneficios u otras pérdidas intangibles, ni de interrupciones por causas ajenas a su control.\n\nEn cualquier caso, la responsabilidad máxima del titular quedará limitada al importe total abonado por el usuario en los tres meses anteriores al evento que origine la reclamación.",
      },
      {
        title: "9. Modificaciones de los Términos",
        body: "El titular se reserva el derecho a modificar los presentes Términos en cualquier momento. Las modificaciones serán notificadas al usuario con al menos 15 días de antelación mediante correo electrónico o aviso en la Aplicación.\n\nSi el usuario continúa usando el Servicio tras la entrada en vigor de los nuevos Términos, se entenderá que los acepta. En caso contrario, podrá cancelar su suscripción conforme al apartado 5.",
      },
      {
        title: "10. Ley aplicable y jurisdicción",
        body: "Los presentes Términos se rigen íntegramente por la legislación española, en particular por el Real Decreto Legislativo 1/2007, la Ley 34/2002 y el Código Civil.\n\nPara la resolución de cualquier controversia, las partes se someten a los Juzgados y Tribunales de Málaga, salvo que la normativa de protección de consumidores establezca un fuero imperativo distinto.",
      },
    ],
  },
};

export default function Legal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tab: initialTab } = useLocalSearchParams();
  const [tab, setTab] = useState(initialTab || "privacidad");
  const scrollRef = useRef(null);

  const doc = DOCS[tab];

  const onTabChange = (key) => {
    setTab(key);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg, paddingTop: insets.top }}>
      <StatusBar style="dark" />

      {/* Cabecera */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: T.line,
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingVertical: 4,
            paddingRight: 8,
          }}
        >
          <ArrowLeft size={18} color={T.inkSoft} strokeWidth={2} />
          <Text style={{ color: T.inkSoft, fontSize: 14 }}>Volver</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 16, fontFamily: T.serif, color: T.ink, flex: 1 }}>
          Información Legal
        </Text>
      </View>

      {/* Pestañas */}
      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: 16,
          paddingVertical: 10,
          gap: 8,
          borderBottomWidth: 1,
          borderBottomColor: T.line,
          backgroundColor: T.bg,
        }}
      >
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            onPress={() => onTabChange(t.key)}
            activeOpacity={0.75}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 20,
              backgroundColor: tab === t.key ? T.primary : T.surface,
              borderWidth: 1,
              borderColor: tab === t.key ? T.primary : T.line,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: tab === t.key ? "#fff" : T.inkSoft,
              }}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Contenido */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 28,
          paddingBottom: insets.bottom + 48,
          maxWidth: 720,
          width: "100%",
          alignSelf: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            fontSize: 26,
            fontFamily: T.serif,
            color: T.ink,
            letterSpacing: -0.5,
            marginBottom: 6,
          }}
        >
          {doc.title}
        </Text>
        <Text style={{ fontSize: 12, color: T.muted, marginBottom: 20 }}>
          {doc.date}
        </Text>

        {doc.intro && (
          <Text
            style={{
              fontSize: 14,
              color: T.inkSoft,
              lineHeight: 22,
              marginBottom: 24,
              fontStyle: "italic",
            }}
          >
            {doc.intro}
          </Text>
        )}

        {doc.sections.map((s, i) => (
          <View
            key={i}
            style={{
              marginBottom: 24,
              paddingBottom: 24,
              borderBottomWidth: i < doc.sections.length - 1 ? 1 : 0,
              borderBottomColor: T.line,
            }}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: "700",
                color: T.ink,
                marginBottom: 8,
                letterSpacing: -0.1,
              }}
            >
              {s.title}
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: T.inkSoft,
                lineHeight: 21,
              }}
            >
              {s.body}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
