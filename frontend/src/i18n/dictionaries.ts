export const dictionaries = {
  'pt-BR': {
    nav: {
      attendance: 'Atendimentos',
      search: 'Busca',
      contacts: 'Contatos',
      users: 'Usuários',
      chatbot: 'Chatbot',
      automations: 'Automações',
      campaigns: 'Campanhas',
      reports: 'Relatórios',
      satisfaction: 'Satisfação',
      settings: 'Configurações',
      logout: 'Sair'
    },
    settings: {
      title: 'Configurações do sistema',
      subtitle: 'Ajuste branding, SLA, notificações e integrações globais da plataforma.',
      adminOnly: 'Somente administradores podem alterar estas configurações.',
      toasts: {
        generalSaved: 'Configurações gerais atualizadas com sucesso.',
        serviceSaved: 'Regras de atendimento salvas com sucesso.',
        notificationsSaved: 'Preferências de notificações salvas com sucesso.',
        logoUploaded: 'Logo atualizado com sucesso.',
        logoRemoved: 'Logo removido.',
        errorGeneric: 'Ocorreu um erro inesperado. Tente novamente.'
      },
      general: {
        title: 'Configurações gerais',
        description: 'Personalize identidade visual, idioma e padrões globais da plataforma.',
        action: { save: 'Salvar alterações' },
        companyName: {
          label: 'Nome da empresa / plataforma',
          placeholder: 'Ex: Central de Atendimento WhatsKovi'
        },
        brandColor: { label: 'Cor principal' },
        accentColor: { label: 'Cor de destaque' },
        language: { label: 'Idioma padrão' },
        timezone: { label: 'Fuso horário' },
        dateFormat: { label: 'Formato de data' },
        identity: {
          title: 'Identidade visual',
          description: 'Atualize o logo exibido na aplicação e nos relatórios exportados.',
          upload: 'Arraste uma imagem ou clique para selecionar',
          preview: 'Pré-visualização',
          previewPrimary: 'Primária',
          previewAccent: 'Destaque',
          theme: 'Visualização de temas',
          remove: 'Remover logo'
        }
      },
      service: {
        title: 'Configurações de atendimento',
        description: 'Defina regras globais para tempos de inatividade, limites de tickets e mensagens automáticas.',
        action: { save: 'Salvar regras' },
        inactivity: { label: 'Ticket considerado inativo após (min)' },
        autoClose: { label: 'Fechamento automático após (horas)' },
        autoCloseMessage: {
          label: 'Mensagem de encerramento automático',
          placeholder:
            'Ex: Encerramos este atendimento após um período sem respostas. Caso precise de ajuda novamente, basta nos enviar uma nova mensagem.'
        },
        globalLimit: { label: 'Limite global de tickets' },
        agentLimit: { label: 'Limite por atendente' },
        sound: {
          label: 'Ativar notificações sonoras',
          description: 'Alertas para novos tickets, mensagens recebidas e transferências.'
        },
        survey: {
          label: 'Enviar pesquisa de satisfação automaticamente',
          description: 'Dispara formulário NPS ao finalizar cada atendimento.'
        },
        preview: {
          title: 'Pré-visualização',
          description: 'Simule a mensagem de encerramento que será enviada aos clientes.',
          show: 'Visualizar mensagem',
          hide: 'Esconder prévia',
          messageTitle: 'Mensagem automática enviada ao cliente:',
          empty: 'Nenhuma mensagem configurada.'
        }
      },
      notifications: {
        title: 'Notificações',
        description: 'Configure alertas em tempo real, push no navegador e envio por e-mail (SMTP).',
        action: { save: 'Salvar preferências' },
        alerts: {
          title: 'Alertas do sistema',
          newTicket: {
            label: 'Novo ticket na fila',
            description: 'Avisar sempre que um ticket for criado ou cair na fila monitorada.'
          },
          message: {
            label: 'Nova mensagem do cliente',
            description: 'Receber alerta quando o cliente responder enquanto o ticket estiver aberto.'
          },
          transfer: {
            label: 'Ticket transferido',
            description: 'Ser notificado quando um ticket for transferido para a fila ou usuário.'
          }
        },
        sound: {
          title: 'Som dos alertas',
          description: 'Escolha o tom do aviso ao chegar uma nova notificação.',
          enable: 'Ativar',
          classic: 'Clássico vibrante',
          soft: 'Suave e discreto',
          bright: 'Intenso e curto'
        },
        push: {
          label: 'Notificações push no navegador',
          description: 'Receber alertas mesmo com a aba minimizada (requer consentimento do navegador).'
        },
        email: {
          label: 'Envio por e-mail',
          description: 'Encaminhar alertas críticos para o e-mail configurado abaixo.'
        },
        smtp: {
          title: 'Configuração SMTP',
          description:
            'Utilize um servidor SMTP próprio para disparo de notificações importantes (ex: ticket inativo, falha na conexão WhatsApp).',
          host: 'Host',
          port: 'Porta',
          user: 'Usuário',
          password: 'Senha',
          from: 'Remetente padrão (from)',
          secure: 'Conexão segura (SSL/TLS)',
          secureHelp: 'Use SSL/TLS para conexões seguras (recomendado 465 para SSL, 587 para STARTTLS).'
        }
      },
      integration: {
        tokenGenerated: 'Novo token de acesso gerado.'
      }
    },
    languages: {
      'pt-BR': 'Português (Brasil)',
      'en-US': 'Inglês (Estados Unidos)',
      'es-ES': 'Espanhol (Espanha)'
    }
  },
  'en-US': {
    nav: {
      attendance: 'Tickets',
      search: 'Search',
      contacts: 'Contacts',
      users: 'Users',
      chatbot: 'Chatbot',
      automations: 'Automations',
      campaigns: 'Campaigns',
      reports: 'Reports',
      satisfaction: 'Satisfaction',
      settings: 'Settings',
      logout: 'Log out'
    },
    settings: {
      title: 'System settings',
      subtitle: 'Adjust branding, SLA, notifications and global platform configurations.',
      adminOnly: 'Only administrators can change these settings.',
      toasts: {
        generalSaved: 'General settings updated successfully.',
        serviceSaved: 'Service rules saved successfully.',
        notificationsSaved: 'Notification preferences saved successfully.',
        logoUploaded: 'Logo updated successfully.',
        logoRemoved: 'Logo removed.',
        errorGeneric: 'Something went wrong. Please try again.'
      },
      general: {
        title: 'General settings',
        description: 'Customize visual identity, language and global platform defaults.',
        action: { save: 'Save changes' },
        companyName: {
          label: 'Company / platform name',
          placeholder: 'E.g. WhatsKovi Support Center'
        },
        brandColor: { label: 'Primary color' },
        accentColor: { label: 'Accent color' },
        language: { label: 'Default language' },
        timezone: { label: 'Time zone' },
        dateFormat: { label: 'Date format' },
        identity: {
          title: 'Visual identity',
          description: 'Update the logo shown in the application header and exported reports.',
          upload: 'Drag an image or click to select',
          preview: 'Preview',
          previewPrimary: 'Primary',
          previewAccent: 'Accent',
          theme: 'Theme preview',
          remove: 'Remove logo'
        }
      },
      service: {
        title: 'Service settings',
        description: 'Define inactivity rules, ticket limits and automated messages.',
        action: { save: 'Save rules' },
        inactivity: { label: 'Ticket considered inactive after (min)' },
        autoClose: { label: 'Auto close after (hours)' },
        autoCloseMessage: {
          label: 'Automatic closing message',
          placeholder:
            'E.g. We closed this ticket after a period without replies. If you need help again, just send us a new message.'
        },
        globalLimit: { label: 'Global ticket limit' },
        agentLimit: { label: 'Limit per agent' },
        sound: {
          label: 'Enable sound notifications',
          description: 'Alerts for new tickets, incoming messages and transfers.'
        },
        survey: {
          label: 'Send satisfaction survey automatically',
          description: 'Trigger NPS form when closing each service.'
        },
        preview: {
          title: 'Preview',
          description: 'Simulate the closing message sent to customers.',
          show: 'Show message',
          hide: 'Hide preview',
          messageTitle: 'Automatic message sent to the customer:',
          empty: 'No message configured.'
        }
      },
      notifications: {
        title: 'Notifications',
        description: 'Configure real-time alerts, browser push notifications and email (SMTP).',
        action: { save: 'Save preferences' },
        alerts: {
          title: 'System alerts',
          newTicket: {
            label: 'New ticket in queue',
            description: 'Notify whenever a ticket is created or enters a monitored queue.'
          },
          message: {
            label: 'New customer message',
            description: 'Alert agents when a customer replies while the ticket is open.'
          },
          transfer: {
            label: 'Ticket transfer',
            description: 'Notify when a ticket is transferred to a queue or agent.'
          }
        },
        sound: {
          title: 'Alert sound',
          description: 'Choose the tone played when a new notification arrives.',
          enable: 'Enable',
          classic: 'Classic vibrant',
          soft: 'Soft and calm',
          bright: 'Bright and short'
        },
        push: {
          label: 'Browser push notifications',
          description: 'Receive alerts even with the tab minimized (requires browser permission).'
        },
        email: {
          label: 'Email delivery',
          description: 'Forward critical alerts to the configured email address.'
        },
        smtp: {
          title: 'SMTP configuration',
          description:
            'Use your SMTP server to send important alerts (e.g. inactive tickets, WhatsApp connection issues).',
          host: 'Host',
          port: 'Port',
          user: 'User',
          password: 'Password',
          from: 'Default sender (from)',
          secure: 'Secure connection (SSL/TLS)',
          secureHelp: 'Use SSL/TLS for secure connections (recommend 465 for SSL, 587 for STARTTLS).'
        }
      },
      integration: {
        tokenGenerated: 'New access token generated.'
      }
    },
    languages: {
      'pt-BR': 'Portuguese (Brazil)',
      'en-US': 'English (US)',
      'es-ES': 'Spanish (Spain)'
    }
  },
  'es-ES': {
    nav: {
      attendance: 'Atenciones',
      search: 'Búsqueda',
      contacts: 'Contactos',
      users: 'Usuarios',
      chatbot: 'Chatbot',
      automations: 'Automatizaciones',
      campaigns: 'Campañas',
      reports: 'Informes',
      satisfaction: 'Satisfacción',
      settings: 'Configuraciones',
      logout: 'Salir'
    },
    settings: {
      title: 'Configuraciones del sistema',
      subtitle: 'Ajusta el branding, SLA, notificaciones e integraciones globales de la plataforma.',
      adminOnly: 'Solo los administradores pueden cambiar estas configuraciones.',
      toasts: {
        generalSaved: 'Configuraciones generales actualizadas correctamente.',
        serviceSaved: 'Reglas de atención guardadas correctamente.',
        notificationsSaved: 'Preferencias de notificaciones guardadas correctamente.',
        logoUploaded: 'Logo actualizado correctamente.',
        logoRemoved: 'Logo eliminado.',
        errorGeneric: 'Algo salió mal. Intenta nuevamente.'
      },
      general: {
        title: 'Configuraciones generales',
        description: 'Personaliza la identidad visual, idioma y parámetros globales de la plataforma.',
        action: { save: 'Guardar cambios' },
        companyName: {
          label: 'Nombre de la empresa / plataforma',
          placeholder: 'Ej: Centro de Atención WhatsKovi'
        },
        brandColor: { label: 'Color principal' },
        accentColor: { label: 'Color de acento' },
        language: { label: 'Idioma predeterminado' },
        timezone: { label: 'Zona horaria' },
        dateFormat: { label: 'Formato de fecha' },
        identity: {
          title: 'Identidad visual',
          description: 'Actualiza el logo que se muestra en la aplicación y en los informes exportados.',
          upload: 'Arrastra una imagen o haz clic para seleccionar',
          preview: 'Previsualización',
          previewPrimary: 'Principal',
          previewAccent: 'Acento',
          theme: 'Vista previa del tema',
          remove: 'Quitar logo'
        }
      },
      service: {
        title: 'Configuraciones de atención',
        description: 'Define reglas globales de inactividad, límites de tickets y mensajes automáticos.',
        action: { save: 'Guardar reglas' },
        inactivity: { label: 'Ticket considerado inactivo después de (min)' },
        autoClose: { label: 'Cierre automático después de (horas)' },
        autoCloseMessage: {
          label: 'Mensaje de cierre automático',
          placeholder:
            'Ej: Cerramos este ticket tras un periodo sin respuestas. Si necesitas ayuda nuevamente, envíanos un mensaje.'
        },
        globalLimit: { label: 'Límite global de tickets' },
        agentLimit: { label: 'Límite por agente' },
        sound: {
          label: 'Activar notificaciones sonoras',
          description: 'Alertas para nuevos tickets, mensajes recibidos y transferencias.'
        },
        survey: {
          label: 'Enviar encuesta de satisfacción automáticamente',
          description: 'Dispara el formulario NPS al finalizar cada atención.'
        },
        preview: {
          title: 'Previsualización',
          description: 'Simula el mensaje de cierre que se enviará a los clientes.',
          show: 'Ver mensaje',
          hide: 'Ocultar previsualización',
          messageTitle: 'Mensaje automático enviado al cliente:',
          empty: 'Ningún mensaje configurado.'
        }
      },
      notifications: {
        title: 'Notificaciones',
        description: 'Configura alertas en tiempo real, notificaciones push del navegador y envío por correo (SMTP).',
        action: { save: 'Guardar preferencias' },
        alerts: {
          title: 'Alertas del sistema',
          newTicket: {
            label: 'Nuevo ticket en la cola',
            description: 'Avisar cuando un ticket se cree o llegue a la cola monitoreada.'
          },
          message: {
            label: 'Nuevo mensaje del cliente',
            description: 'Alertar cuando el cliente responda mientras el ticket está abierto.'
          },
          transfer: {
            label: 'Transferencia de ticket',
            description: 'Notificar cuando un ticket sea transferido a la cola o usuario.'
          }
        },
        sound: {
          title: 'Sonido de las alertas',
          description: 'Elige el tono que se reproducirá al recibir una notificación.',
          enable: 'Activar',
          classic: 'Clásico vibrante',
          soft: 'Suave y discreto',
          bright: 'Intenso y corto'
        },
        push: {
          label: 'Notificaciones push del navegador',
          description: 'Recibe alertas incluso con la pestaña minimizada (requiere permiso del navegador).'
        },
        email: {
          label: 'Envío por correo electrónico',
          description: 'Reenvía alertas críticas al correo configurado.'
        },
        smtp: {
          title: 'Configuración SMTP',
          description:
            'Utiliza tu servidor SMTP para enviar alertas importantes (ej: ticket inactivo, fallo en la conexión de WhatsApp).',
          host: 'Host',
          port: 'Puerto',
          user: 'Usuario',
          password: 'Contraseña',
          from: 'Remitente predeterminado (from)',
          secure: 'Conexión segura (SSL/TLS)',
          secureHelp: 'Usa SSL/TLS para conexiones seguras (recomendado 465 para SSL, 587 para STARTTLS).'
        }
      },
      integration: {
        tokenGenerated: 'Nuevo token de acceso generado.'
      }
    },
    languages: {
      'pt-BR': 'Portugués (Brasil)',
      'en-US': 'Inglés (Estados Unidos)',
      'es-ES': 'Español (España)'
    }
  }
} as const;

export type LanguageCode = keyof typeof dictionaries;
