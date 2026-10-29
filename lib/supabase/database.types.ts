export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      acessos: {
        Row: {
          categoria: string | null
          cliente_id: string
          created_at: string
          email: string | null
          id: string
          nome_servico: string
          observacoes: string | null
          referencia_senha: string | null
          url_login: string | null
          user_id: string
          usuario: string | null
          workspace_id: string | null
        }
        Insert: {
          categoria?: string | null
          cliente_id: string
          created_at?: string
          email?: string | null
          id?: string
          nome_servico: string
          observacoes?: string | null
          referencia_senha?: string | null
          url_login?: string | null
          user_id?: string
          usuario?: string | null
          workspace_id?: string | null
        }
        Update: {
          categoria?: string | null
          cliente_id?: string
          created_at?: string
          email?: string | null
          id?: string
          nome_servico?: string
          observacoes?: string | null
          referencia_senha?: string | null
          url_login?: string | null
          user_id?: string
          usuario?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acessos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acessos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      assinaturas: {
        Row: {
          cliente_id: string
          created_at: string
          data_inicio: string | null
          id: string
          plano: string
          proxima_cobranca: string | null
          recorrencia: string | null
          status: string
          stripe_price_id: string | null
          stripe_status: string | null
          stripe_subscription_id: string | null
          user_id: string
          valor: number | null
          workspace_id: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_inicio?: string | null
          id?: string
          plano: string
          proxima_cobranca?: string | null
          recorrencia?: string | null
          status?: string
          stripe_price_id?: string | null
          stripe_status?: string | null
          stripe_subscription_id?: string | null
          user_id?: string
          valor?: number | null
          workspace_id?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_inicio?: string | null
          id?: string
          plano?: string
          proxima_cobranca?: string | null
          recorrencia?: string | null
          status?: string
          stripe_price_id?: string | null
          stripe_status?: string | null
          stripe_subscription_id?: string | null
          user_id?: string
          valor?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assinaturas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assinaturas_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacoes_desempenho: {
        Row: {
          avaliador_id: string | null
          created_at: string
          funcionario_id: string
          id: string
          metas_proximo_periodo: string | null
          nota: number | null
          observacoes: string | null
          periodo_referencia: string
          pontos_fortes: string | null
          pontos_melhoria: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          avaliador_id?: string | null
          created_at?: string
          funcionario_id: string
          id?: string
          metas_proximo_periodo?: string | null
          nota?: number | null
          observacoes?: string | null
          periodo_referencia: string
          pontos_fortes?: string | null
          pontos_melhoria?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          avaliador_id?: string | null
          created_at?: string
          funcionario_id?: string
          id?: string
          metas_proximo_periodo?: string | null
          nota?: number | null
          observacoes?: string | null
          periodo_referencia?: string
          pontos_fortes?: string | null
          pontos_melhoria?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_desempenho_avaliador_id_fkey"
            columns: ["avaliador_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_desempenho_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_desempenho_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      backups: {
        Row: {
          cliente_id: string
          created_at: string
          data: string
          id: string
          link_ou_arquivo: string | null
          local: string | null
          projeto_id: string | null
          tipo: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data?: string
          id?: string
          link_ou_arquivo?: string | null
          local?: string | null
          projeto_id?: string | null
          tipo?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data?: string
          id?: string
          link_ou_arquivo?: string | null
          local?: string | null
          projeto_id?: string | null
          tipo?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "backups_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backups_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backups_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficios: {
        Row: {
          created_at: string
          funcionario_id: string
          id: string
          observacoes: string | null
          tipo: string
          user_id: string
          valor: number | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          funcionario_id: string
          id?: string
          observacoes?: string | null
          tipo: string
          user_id?: string
          valor?: number | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          funcionario_id?: string
          id?: string
          observacoes?: string | null
          tipo?: string
          user_id?: string
          valor?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beneficios_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficios_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      calendario_conteudo: {
        Row: {
          canal: string
          conteudo: string | null
          created_at: string
          data_publicacao: string | null
          id: string
          link_publicado: string | null
          observacoes: string | null
          responsavel_id: string | null
          status: string
          tipo: string
          titulo: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          canal?: string
          conteudo?: string | null
          created_at?: string
          data_publicacao?: string | null
          id?: string
          link_publicado?: string | null
          observacoes?: string | null
          responsavel_id?: string | null
          status?: string
          tipo?: string
          titulo: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          canal?: string
          conteudo?: string | null
          created_at?: string
          data_publicacao?: string | null
          id?: string
          link_publicado?: string | null
          observacoes?: string | null
          responsavel_id?: string | null
          status?: string
          tipo?: string
          titulo?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendario_conteudo_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      campanhas: {
        Row: {
          canal: string
          cliques: number | null
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          id: string
          impressoes: number | null
          nome: string
          observacoes: string | null
          orcamento_planejado: number | null
          status: string
          updated_at: string
          user_id: string
          valor_gasto: number | null
          workspace_id: string | null
        }
        Insert: {
          canal?: string
          cliques?: number | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          impressoes?: number | null
          nome: string
          observacoes?: string | null
          orcamento_planejado?: number | null
          status?: string
          updated_at?: string
          user_id?: string
          valor_gasto?: number | null
          workspace_id?: string | null
        }
        Update: {
          canal?: string
          cliques?: number | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          impressoes?: number | null
          nome?: string
          observacoes?: string | null
          orcamento_planejado?: number | null
          status?: string
          updated_at?: string
          user_id?: string
          valor_gasto?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campanhas_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      candidatos: {
        Row: {
          created_at: string
          curriculo_path: string | null
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          origem: string | null
          status: string
          telefone: string | null
          updated_at: string
          user_id: string
          vaga_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          curriculo_path?: string | null
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          origem?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
          user_id?: string
          vaga_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          curriculo_path?: string | null
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          origem?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
          user_id?: string
          vaga_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidatos_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidatos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          abordado_por: string | null
          assinatura_ativa: boolean
          assinatura_plano: string | null
          assinatura_vencimento: string | null
          contato: string | null
          created_at: string
          email: string | null
          id: string
          lead_origem_id: string | null
          nome: string
          responsavel: string | null
          resumo: string | null
          segmento: string | null
          site_link: string | null
          status: string
          stripe_customer_id: string | null
          telefone: string | null
          user_id: string
          vendedor_id: string | null
          workspace_id: string | null
        }
        Insert: {
          abordado_por?: string | null
          assinatura_ativa?: boolean
          assinatura_plano?: string | null
          assinatura_vencimento?: string | null
          contato?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lead_origem_id?: string | null
          nome: string
          responsavel?: string | null
          resumo?: string | null
          segmento?: string | null
          site_link?: string | null
          status?: string
          stripe_customer_id?: string | null
          telefone?: string | null
          user_id?: string
          vendedor_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          abordado_por?: string | null
          assinatura_ativa?: boolean
          assinatura_plano?: string | null
          assinatura_vencimento?: string | null
          contato?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lead_origem_id?: string | null
          nome?: string
          responsavel?: string | null
          resumo?: string | null
          segmento?: string | null
          site_link?: string | null
          status?: string
          stripe_customer_id?: string | null
          telefone?: string | null
          user_id?: string
          vendedor_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_lead_origem_id_fkey"
            columns: ["lead_origem_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      comissoes: {
        Row: {
          cliente_id: string | null
          created_at: string
          data_referencia: string | null
          id: string
          observacoes: string | null
          percentual_comissao: number | null
          proposta_id: string | null
          status: string
          user_id: string
          valor_comissao: number | null
          valor_venda: number | null
          vendedor_id: string | null
          workspace_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          data_referencia?: string | null
          id?: string
          observacoes?: string | null
          percentual_comissao?: number | null
          proposta_id?: string | null
          status?: string
          user_id?: string
          valor_comissao?: number | null
          valor_venda?: number | null
          vendedor_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          data_referencia?: string | null
          id?: string
          observacoes?: string | null
          percentual_comissao?: number | null
          proposta_id?: string | null
          status?: string
          user_id?: string
          valor_comissao?: number | null
          valor_venda?: number | null
          vendedor_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comissoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissoes_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "propostas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissoes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_juridico: {
        Row: {
          categoria: string
          checklist: Json
          cliente_id: string | null
          created_at: string
          id: string
          observacoes: string | null
          proxima_revisao: string | null
          status: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          categoria?: string
          checklist?: Json
          cliente_id?: string | null
          created_at?: string
          id?: string
          observacoes?: string | null
          proxima_revisao?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          categoria?: string
          checklist?: Json
          cliente_id?: string | null
          created_at?: string
          id?: string
          observacoes?: string | null
          proxima_revisao?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_juridico_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_juridico_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      comprovantes: {
        Row: {
          arquivo_path: string | null
          cliente_id: string
          created_at: string
          data: string | null
          descricao: string | null
          id: string
          link: string | null
          user_id: string
          valor: number | null
          workspace_id: string | null
        }
        Insert: {
          arquivo_path?: string | null
          cliente_id: string
          created_at?: string
          data?: string | null
          descricao?: string | null
          id?: string
          link?: string | null
          user_id?: string
          valor?: number | null
          workspace_id?: string | null
        }
        Update: {
          arquivo_path?: string | null
          cliente_id?: string
          created_at?: string
          data?: string | null
          descricao?: string | null
          id?: string
          link?: string | null
          user_id?: string
          valor?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comprovantes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comprovantes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_pagar: {
        Row: {
          categoria: string | null
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          fornecedor: string | null
          id: string
          observacoes: string | null
          status: string
          user_id: string
          valor: number
          workspace_id: string | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento: string
          descricao: string
          fornecedor?: string | null
          id?: string
          observacoes?: string | null
          status?: string
          user_id?: string
          valor: number
          workspace_id?: string | null
        }
        Update: {
          categoria?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string
          fornecedor?: string | null
          id?: string
          observacoes?: string | null
          status?: string
          user_id?: string
          valor?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contas_pagar_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_receber: {
        Row: {
          cliente_id: string | null
          created_at: string
          data_recebimento: string | null
          data_vencimento: string
          descricao: string
          id: string
          observacoes: string | null
          proposta_id: string | null
          status: string
          user_id: string
          valor: number
          workspace_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          data_recebimento?: string | null
          data_vencimento: string
          descricao: string
          id?: string
          observacoes?: string | null
          proposta_id?: string | null
          status?: string
          user_id?: string
          valor: number
          workspace_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          data_recebimento?: string | null
          data_vencimento?: string
          descricao?: string
          id?: string
          observacoes?: string | null
          proposta_id?: string | null
          status?: string
          user_id?: string
          valor?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contas_receber_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "propostas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          arquivo_path: string | null
          cliente_id: string
          created_at: string
          data: string | null
          descricao: string
          id: string
          link: string | null
          user_id: string
          valor: number | null
          vencimento: string | null
          workspace_id: string | null
        }
        Insert: {
          arquivo_path?: string | null
          cliente_id: string
          created_at?: string
          data?: string | null
          descricao: string
          id?: string
          link?: string | null
          user_id?: string
          valor?: number | null
          vencimento?: string | null
          workspace_id?: string | null
        }
        Update: {
          arquivo_path?: string | null
          cliente_id?: string
          created_at?: string
          data?: string | null
          descricao?: string
          id?: string
          link?: string | null
          user_id?: string
          valor?: number | null
          vencimento?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      controle_ponto: {
        Row: {
          created_at: string
          data: string
          entrada: string | null
          funcionario_id: string
          horas_trabalhadas: number | null
          id: string
          observacoes: string | null
          saida: string | null
          saida_almoco: string | null
          status: string
          user_id: string
          volta_almoco: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          data: string
          entrada?: string | null
          funcionario_id: string
          horas_trabalhadas?: number | null
          id?: string
          observacoes?: string | null
          saida?: string | null
          saida_almoco?: string | null
          status?: string
          user_id?: string
          volta_almoco?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          data?: string
          entrada?: string | null
          funcionario_id?: string
          horas_trabalhadas?: number | null
          id?: string
          observacoes?: string | null
          saida?: string | null
          saida_almoco?: string | null
          status?: string
          user_id?: string
          volta_almoco?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "controle_ponto_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "controle_ponto_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      conversas: {
        Row: {
          created_at: string
          dono_id: string
          id: string
          membro_id: string
          papel: string
        }
        Insert: {
          created_at?: string
          dono_id: string
          id?: string
          membro_id: string
          papel: string
        }
        Update: {
          created_at?: string
          dono_id?: string
          id?: string
          membro_id?: string
          papel?: string
        }
        Relationships: []
      }
      convites: {
        Row: {
          created_at: string
          dono_id: string
          email_convidado: string
          expira_em: string
          id: string
          papel: string
          respondido_em: string | null
          status: string
          token: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          dono_id?: string
          email_convidado: string
          expira_em?: string
          id?: string
          papel: string
          respondido_em?: string | null
          status?: string
          token?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          dono_id?: string
          email_convidado?: string
          expira_em?: string
          id?: string
          papel?: string
          respondido_em?: string | null
          status?: string
          token?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "convites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      departamentos: {
        Row: {
          created_at: string
          descricao: string | null
          gestor_funcionario_id: string | null
          id: string
          nome: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          gestor_funcionario_id?: string | null
          id?: string
          nome: string
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string | null
          gestor_funcionario_id?: string | null
          id?: string
          nome?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departamentos_gestor_funcionario_id_fkey"
            columns: ["gestor_funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departamentos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          arquivo_path: string | null
          categoria: string | null
          cliente_id: string | null
          conteudo: string | null
          created_at: string
          data: string | null
          id: string
          id_externo_assinatura: string | null
          link_assinatura: string | null
          precisa_assinatura: boolean
          signatarios: Json
          status_assinatura: string | null
          tipo: string
          titulo: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          arquivo_path?: string | null
          categoria?: string | null
          cliente_id?: string | null
          conteudo?: string | null
          created_at?: string
          data?: string | null
          id?: string
          id_externo_assinatura?: string | null
          link_assinatura?: string | null
          precisa_assinatura?: boolean
          signatarios?: Json
          status_assinatura?: string | null
          tipo: string
          titulo: string
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          arquivo_path?: string | null
          categoria?: string | null
          cliente_id?: string | null
          conteudo?: string | null
          created_at?: string
          data?: string | null
          id?: string
          id_externo_assinatura?: string | null
          link_assinatura?: string | null
          precisa_assinatura?: boolean
          signatarios?: Json
          status_assinatura?: string | null
          tipo?: string
          titulo?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      fechamentos_mensais: {
        Row: {
          checklist: Json
          cliente_id: string
          created_at: string
          id: string
          mes_referencia: string
          observacoes: string | null
          status: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          checklist?: Json
          cliente_id: string
          created_at?: string
          id?: string
          mes_referencia: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          checklist?: Json
          cliente_id?: string
          created_at?: string
          id?: string
          mes_referencia?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fechamentos_mensais_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fechamentos_mensais_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      ferias: {
        Row: {
          created_at: string
          data_fim_gozo: string | null
          data_inicio_gozo: string | null
          dias_direito: number | null
          dias_gozados: number | null
          funcionario_id: string
          id: string
          observacoes: string | null
          periodo_aquisitivo_fim: string | null
          periodo_aquisitivo_inicio: string | null
          status: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          data_fim_gozo?: string | null
          data_inicio_gozo?: string | null
          dias_direito?: number | null
          dias_gozados?: number | null
          funcionario_id: string
          id?: string
          observacoes?: string | null
          periodo_aquisitivo_fim?: string | null
          periodo_aquisitivo_inicio?: string | null
          status?: string
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          data_fim_gozo?: string | null
          data_inicio_gozo?: string | null
          dias_direito?: number | null
          dias_gozados?: number | null
          funcionario_id?: string
          id?: string
          observacoes?: string | null
          periodo_aquisitivo_fim?: string | null
          periodo_aquisitivo_inicio?: string | null
          status?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ferias_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      folha_pagamento: {
        Row: {
          conta_pagar_id: string | null
          created_at: string
          data_pagamento: string | null
          descontos: number | null
          funcionario_id: string
          id: string
          mes_referencia: string
          observacoes: string | null
          salario_bruto: number | null
          salario_liquido: number | null
          status: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          conta_pagar_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          descontos?: number | null
          funcionario_id: string
          id?: string
          mes_referencia: string
          observacoes?: string | null
          salario_bruto?: number | null
          salario_liquido?: number | null
          status?: string
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          conta_pagar_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          descontos?: number | null
          funcionario_id?: string
          id?: string
          mes_referencia?: string
          observacoes?: string | null
          salario_bruto?: number | null
          salario_liquido?: number | null
          status?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "folha_pagamento_conta_pagar_id_fkey"
            columns: ["conta_pagar_id"]
            isOneToOne: false
            referencedRelation: "contas_pagar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folha_pagamento_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folha_pagamento_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      followups_lead: {
        Row: {
          canal: string | null
          created_at: string
          data_contato: string
          id: string
          lead_id: string
          proximo_followup: string | null
          resumo: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          canal?: string | null
          created_at?: string
          data_contato?: string
          id?: string
          lead_id: string
          proximo_followup?: string | null
          resumo?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          canal?: string | null
          created_at?: string
          data_contato?: string
          id?: string
          lead_id?: string
          proximo_followup?: string | null
          resumo?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "followups_lead_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followups_lead_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      funcionarios: {
        Row: {
          cargo: string | null
          cpf: string | null
          created_at: string
          data_admissao: string | null
          data_desligamento: string | null
          departamento_id: string | null
          email: string | null
          gestor_id: string | null
          id: string
          membro_id: string | null
          nome: string
          observacoes: string | null
          salario: number | null
          status: string
          telefone: string | null
          tipo_contrato: string | null
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          data_desligamento?: string | null
          departamento_id?: string | null
          email?: string | null
          gestor_id?: string | null
          id?: string
          membro_id?: string | null
          nome: string
          observacoes?: string | null
          salario?: number | null
          status?: string
          telefone?: string | null
          tipo_contrato?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          data_desligamento?: string | null
          departamento_id?: string | null
          email?: string | null
          gestor_id?: string | null
          id?: string
          membro_id?: string | null
          nome?: string
          observacoes?: string | null
          salario?: number | null
          status?: string
          telefone?: string | null
          tipo_contrato?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funcionarios_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funcionarios_gestor_id_fkey"
            columns: ["gestor_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funcionarios_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      gastos: {
        Row: {
          categoria: string | null
          cliente_id: string | null
          created_at: string
          data: string
          id: string
          nome: string
          projeto_id: string | null
          recorrencia: string | null
          tipo: string
          user_id: string
          valor: number
          workspace_id: string | null
        }
        Insert: {
          categoria?: string | null
          cliente_id?: string | null
          created_at?: string
          data?: string
          id?: string
          nome: string
          projeto_id?: string | null
          recorrencia?: string | null
          tipo?: string
          user_id?: string
          valor: number
          workspace_id?: string | null
        }
        Update: {
          categoria?: string | null
          cliente_id?: string | null
          created_at?: string
          data?: string
          id?: string
          nome?: string
          projeto_id?: string | null
          recorrencia?: string | null
          tipo?: string
          user_id?: string
          valor?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gastos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      infraestrutura: {
        Row: {
          cdn: string | null
          cliente_id: string
          contas_email: string | null
          created_at: string
          data_renovacao: string | null
          dns: string | null
          dominio: string | null
          hospedagem: string | null
          id: string
          observacoes: string | null
          servidor: string | null
          ssl: string | null
          tecnologias: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          cdn?: string | null
          cliente_id: string
          contas_email?: string | null
          created_at?: string
          data_renovacao?: string | null
          dns?: string | null
          dominio?: string | null
          hospedagem?: string | null
          id?: string
          observacoes?: string | null
          servidor?: string | null
          ssl?: string | null
          tecnologias?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          cdn?: string | null
          cliente_id?: string
          contas_email?: string | null
          created_at?: string
          data_renovacao?: string | null
          dns?: string | null
          dominio?: string | null
          hospedagem?: string | null
          id?: string
          observacoes?: string | null
          servidor?: string | null
          ssl?: string | null
          tecnologias?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "infraestrutura_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "infraestrutura_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      juridico: {
        Row: {
          created_at: string
          id: string
          nota: string | null
          prazo: string | null
          status: string
          tipo: string
          titulo: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          nota?: string | null
          prazo?: string | null
          status?: string
          tipo?: string
          titulo: string
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          nota?: string | null
          prazo?: string | null
          status?: string
          tipo?: string
          titulo?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "juridico_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamentos_extrato: {
        Row: {
          arquivo_origem: string | null
          comprovante_id: string | null
          created_at: string
          data: string
          descricao: string
          gasto_id: string | null
          id: string
          status_conciliacao: string
          tipo: string
          user_id: string
          valor: number
          workspace_id: string | null
        }
        Insert: {
          arquivo_origem?: string | null
          comprovante_id?: string | null
          created_at?: string
          data: string
          descricao: string
          gasto_id?: string | null
          id?: string
          status_conciliacao?: string
          tipo: string
          user_id?: string
          valor: number
          workspace_id?: string | null
        }
        Update: {
          arquivo_origem?: string | null
          comprovante_id?: string | null
          created_at?: string
          data?: string
          descricao?: string
          gasto_id?: string | null
          id?: string
          status_conciliacao?: string
          tipo?: string
          user_id?: string
          valor?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_extrato_comprovante_id_fkey"
            columns: ["comprovante_id"]
            isOneToOne: false
            referencedRelation: "comprovantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_extrato_gasto_id_fkey"
            columns: ["gasto_id"]
            isOneToOne: false
            referencedRelation: "gastos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_extrato_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_views: {
        Row: {
          duracao_seg: number
          id: string
          last_seen_at: string
          lead_id: string
          started_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          duracao_seg?: number
          id?: string
          last_seen_at?: string
          lead_id: string
          started_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          duracao_seg?: number
          id?: string
          last_seen_at?: string
          lead_id?: string
          started_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_views_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_views_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          abordado_por: string | null
          campanha_id: string | null
          contato: string | null
          created_at: string
          data_previa: string | null
          descricao: string | null
          estagio_funil: string | null
          id: string
          insta_link: string | null
          intervalo_followup_dias: number | null
          motivo_negou: string | null
          nicho: string | null
          nome: string
          previa_enviada: boolean
          proximo_followup: string | null
          resultado: string | null
          site_link: string | null
          status: string
          tem_insta: boolean
          tem_site: boolean
          tipo_contato: string
          ultimo_contato: string | null
          user_id: string
          vendedor_id: string | null
          workspace_id: string | null
        }
        Insert: {
          abordado_por?: string | null
          campanha_id?: string | null
          contato?: string | null
          created_at?: string
          data_previa?: string | null
          descricao?: string | null
          estagio_funil?: string | null
          id?: string
          insta_link?: string | null
          intervalo_followup_dias?: number | null
          motivo_negou?: string | null
          nicho?: string | null
          nome: string
          previa_enviada?: boolean
          proximo_followup?: string | null
          resultado?: string | null
          site_link?: string | null
          status?: string
          tem_insta?: boolean
          tem_site?: boolean
          tipo_contato?: string
          ultimo_contato?: string | null
          user_id?: string
          vendedor_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          abordado_por?: string | null
          campanha_id?: string | null
          contato?: string | null
          created_at?: string
          data_previa?: string | null
          descricao?: string | null
          estagio_funil?: string | null
          id?: string
          insta_link?: string | null
          intervalo_followup_dias?: number | null
          motivo_negou?: string | null
          nicho?: string | null
          nome?: string
          previa_enviada?: boolean
          proximo_followup?: string | null
          resultado?: string | null
          site_link?: string | null
          status?: string
          tem_insta?: boolean
          tem_site?: boolean
          tipo_contato?: string
          ultimo_contato?: string | null
          user_id?: string
          vendedor_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      manutencoes: {
        Row: {
          cliente_id: string
          created_at: string
          data: string
          descricao: string
          id: string
          observacoes: string | null
          projeto_id: string | null
          responsavel: string | null
          tempo_gasto: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data?: string
          descricao: string
          id?: string
          observacoes?: string | null
          projeto_id?: string | null
          responsavel?: string | null
          tempo_gasto?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data?: string
          descricao?: string
          id?: string
          observacoes?: string | null
          projeto_id?: string | null
          responsavel?: string | null
          tempo_gasto?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manutencoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencoes_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencoes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      membros: {
        Row: {
          created_at: string
          dono_id: string
          id: string
          membro_id: string
          papel: string
          status: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          dono_id: string
          id?: string
          membro_id: string
          papel: string
          status?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          dono_id?: string
          id?: string
          membro_id?: string
          papel?: string
          status?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "membros_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens: {
        Row: {
          conteudo: string
          conversa_id: string
          created_at: string
          id: string
          lida: boolean
          remetente_id: string
        }
        Insert: {
          conteudo: string
          conversa_id: string
          created_at?: string
          id?: string
          lida?: boolean
          remetente_id?: string
        }
        Update: {
          conteudo?: string
          conversa_id?: string
          created_at?: string
          id?: string
          lida?: boolean
          remetente_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      metas_okr: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          parent_okr_id: string | null
          periodo_fim: string | null
          periodo_inicio: string | null
          responsavel_id: string | null
          setor: string
          status: string
          tipo: string
          titulo: string
          unidade: string | null
          updated_at: string
          user_id: string
          valor_atual: number | null
          valor_meta: number | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          parent_okr_id?: string | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          responsavel_id?: string | null
          setor?: string
          status?: string
          tipo?: string
          titulo: string
          unidade?: string | null
          updated_at?: string
          user_id?: string
          valor_atual?: number | null
          valor_meta?: number | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          parent_okr_id?: string | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          responsavel_id?: string | null
          setor?: string
          status?: string
          tipo?: string
          titulo?: string
          unidade?: string | null
          updated_at?: string
          user_id?: string
          valor_atual?: number | null
          valor_meta?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "metas_okr_parent_okr_id_fkey"
            columns: ["parent_okr_id"]
            isOneToOne: false
            referencedRelation: "metas_okr"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_okr_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      metas_vendas: {
        Row: {
          created_at: string
          id: string
          mes_referencia: string
          meta_novos_clientes: number | null
          meta_valor: number | null
          observacoes: string | null
          user_id: string
          vendedor_id: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          mes_referencia: string
          meta_novos_clientes?: number | null
          meta_valor?: number | null
          observacoes?: string | null
          user_id?: string
          vendedor_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          mes_referencia?: string
          meta_novos_clientes?: number | null
          meta_valor?: number | null
          observacoes?: string | null
          user_id?: string
          vendedor_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "metas_vendas_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      modelos_contrato: {
        Row: {
          arquivo_path: string | null
          categoria: string | null
          conteudo: string | null
          created_at: string
          id: string
          tags: string[] | null
          titulo: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          arquivo_path?: string | null
          categoria?: string | null
          conteudo?: string | null
          created_at?: string
          id?: string
          tags?: string[] | null
          titulo: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          arquivo_path?: string | null
          categoria?: string | null
          conteudo?: string | null
          created_at?: string
          id?: string
          tags?: string[] | null
          titulo?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "modelos_contrato_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      modulos: {
        Row: {
          ativo: boolean
          categoria: string | null
          chave: string
          created_at: string
          depende_de: string[]
          descricao: string | null
          icone: string | null
          nome: string
          ordem: number
          padrao: boolean
          permissoes_extras: Json
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          chave: string
          created_at?: string
          depende_de?: string[]
          descricao?: string | null
          icone?: string | null
          nome: string
          ordem?: number
          padrao?: boolean
          permissoes_extras?: Json
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          chave?: string
          created_at?: string
          depende_de?: string[]
          descricao?: string | null
          icone?: string | null
          nome?: string
          ordem?: number
          padrao?: boolean
          permissoes_extras?: Json
        }
        Relationships: []
      }
      orcamentos: {
        Row: {
          categoria: string
          created_at: string
          id: string
          mes_referencia: string
          observacoes: string | null
          user_id: string
          valor_planejado: number
          workspace_id: string | null
        }
        Insert: {
          categoria: string
          created_at?: string
          id?: string
          mes_referencia: string
          observacoes?: string | null
          user_id?: string
          valor_planejado: number
          workspace_id?: string | null
        }
        Update: {
          categoria?: string
          created_at?: string
          id?: string
          mes_referencia?: string
          observacoes?: string | null
          user_id?: string
          valor_planejado?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis: {
        Row: {
          created_at: string
          id: string
          nome: string | null
          tipo_conta_padrao: string
        }
        Insert: {
          created_at?: string
          id: string
          nome?: string | null
          tipo_conta_padrao?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string | null
          tipo_conta_padrao?: string
        }
        Relationships: []
      }
      perfis_tipos_ativos: {
        Row: {
          ativado_em: string
          id: string
          nome: string | null
          tipo: string
          user_id: string
        }
        Insert: {
          ativado_em?: string
          id?: string
          nome?: string | null
          tipo: string
          user_id?: string
        }
        Update: {
          ativado_em?: string
          id?: string
          nome?: string | null
          tipo?: string
          user_id?: string
        }
        Relationships: []
      }
      pessoal_accounts: {
        Row: {
          balance: number | null
          created_at: string
          id: string
          name: string | null
          type: string | null
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          balance?: number | null
          created_at?: string
          id?: string
          name?: string | null
          type?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          balance?: number | null
          created_at?: string
          id?: string
          name?: string | null
          type?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pessoal_accounts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoal_categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          kind: string | null
          name: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          kind?: string | null
          name?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          kind?: string | null
          name?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pessoal_categories_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoal_compliance: {
        Row: {
          categoria: string
          checklist: Json
          created_at: string
          id: string
          observacoes: string | null
          proxima_revisao: string | null
          status: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          categoria?: string
          checklist?: Json
          created_at?: string
          id?: string
          observacoes?: string | null
          proxima_revisao?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          categoria?: string
          checklist?: Json
          created_at?: string
          id?: string
          observacoes?: string | null
          proxima_revisao?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pessoal_compliance_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoal_documents: {
        Row: {
          category: string | null
          created_at: string
          expires_at: string | null
          id: string
          name: string | null
          notes: string | null
          storage_path: string | null
          tags: string[] | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          storage_path?: string | null
          tags?: string[] | null
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          storage_path?: string | null
          tags?: string[] | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pessoal_documents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoal_inbox: {
        Row: {
          content: string
          created_at: string
          id: string
          is_triaged: boolean
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_triaged?: boolean
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_triaged?: boolean
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pessoal_inbox_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoal_investments: {
        Row: {
          account_id: string | null
          broker: string | null
          created_at: string
          current_value: number | null
          id: string
          invested_amount: number | null
          investment_type: string | null
          name: string | null
          notes: string | null
          purchase_date: string | null
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          account_id?: string | null
          broker?: string | null
          created_at?: string
          current_value?: number | null
          id?: string
          invested_amount?: number | null
          investment_type?: string | null
          name?: string | null
          notes?: string | null
          purchase_date?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          account_id?: string | null
          broker?: string | null
          created_at?: string
          current_value?: number | null
          id?: string
          invested_amount?: number | null
          investment_type?: string | null
          name?: string | null
          notes?: string | null
          purchase_date?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pessoal_investments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "pessoal_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoal_investments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoal_juridico_contabil: {
        Row: {
          created_at: string
          id: string
          nota: string | null
          prazo: string | null
          status: string
          tipo: string
          titulo: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          nota?: string | null
          prazo?: string | null
          status?: string
          tipo?: string
          titulo: string
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          nota?: string | null
          prazo?: string | null
          status?: string
          tipo?: string
          titulo?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pessoal_juridico_contabil_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoal_library_items: {
        Row: {
          captured_at: string
          id: string
          item_type: string | null
          notes: string | null
          project_id: string | null
          status: string
          tags: string[] | null
          thumbnail_url: string | null
          title: string | null
          url: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          captured_at?: string
          id?: string
          item_type?: string | null
          notes?: string | null
          project_id?: string | null
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string | null
          url?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          captured_at?: string
          id?: string
          item_type?: string | null
          notes?: string | null
          project_id?: string | null
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string | null
          url?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pessoal_library_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "pessoal_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoal_library_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoal_projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          links: Json
          name: string | null
          status: string
          tags: string[] | null
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          links?: Json
          name?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          links?: Json
          name?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pessoal_projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoal_propriedade_intelectual: {
        Row: {
          created_at: string
          data_registro: string | null
          data_renovacao: string | null
          id: string
          nome: string
          numero_registro: string | null
          observacoes: string | null
          orgao: string | null
          status: string
          tipo: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          data_registro?: string | null
          data_renovacao?: string | null
          id?: string
          nome: string
          numero_registro?: string | null
          observacoes?: string | null
          orgao?: string | null
          status?: string
          tipo?: string
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          data_registro?: string | null
          data_renovacao?: string | null
          id?: string
          nome?: string
          numero_registro?: string | null
          observacoes?: string | null
          orgao?: string | null
          status?: string
          tipo?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pessoal_propriedade_intelectual_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoal_recurring_expense_payments: {
        Row: {
          created_at: string
          id: string
          paid_at: string | null
          recurring_expense_id: string | null
          reference_month: string
          status: string
          transaction_id: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          paid_at?: string | null
          recurring_expense_id?: string | null
          reference_month: string
          status?: string
          transaction_id?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          paid_at?: string | null
          recurring_expense_id?: string | null
          reference_month?: string
          status?: string
          transaction_id?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pessoal_recurring_expense_payments_recurring_expense_id_fkey"
            columns: ["recurring_expense_id"]
            isOneToOne: false
            referencedRelation: "pessoal_recurring_expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoal_recurring_expense_payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "pessoal_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoal_recurring_expense_payments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoal_recurring_expenses: {
        Row: {
          account_id: string | null
          amount: number | null
          category_id: string | null
          created_at: string
          due_day: number | null
          id: string
          is_active: boolean
          name: string | null
          notes: string | null
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          account_id?: string | null
          amount?: number | null
          category_id?: string | null
          created_at?: string
          due_day?: number | null
          id?: string
          is_active?: boolean
          name?: string | null
          notes?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number | null
          category_id?: string | null
          created_at?: string
          due_day?: number | null
          id?: string
          is_active?: boolean
          name?: string | null
          notes?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pessoal_recurring_expenses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "pessoal_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoal_recurring_expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "pessoal_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoal_recurring_expenses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoal_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          project_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          project_id?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          project_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pessoal_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "pessoal_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoal_tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoal_transactions: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          is_recurring: boolean
          transaction_date: string
          type: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_recurring?: boolean
          transaction_date?: string
          type?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_recurring?: boolean
          transaction_date?: string
          type?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pessoal_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "pessoal_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoal_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "pessoal_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoal_transactions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      processos: {
        Row: {
          cliente_id: string
          created_at: string
          descricao_prazo: string | null
          fase: string | null
          id: string
          numero_processo: string | null
          observacoes: string | null
          parte_contraria: string | null
          proximo_prazo: string | null
          tipo_acao: string | null
          tribunal_orgao: string | null
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          descricao_prazo?: string | null
          fase?: string | null
          id?: string
          numero_processo?: string | null
          observacoes?: string | null
          parte_contraria?: string | null
          proximo_prazo?: string | null
          tipo_acao?: string | null
          tribunal_orgao?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          descricao_prazo?: string | null
          fase?: string | null
          id?: string
          numero_processo?: string | null
          observacoes?: string | null
          parte_contraria?: string | null
          proximo_prazo?: string | null
          tipo_acao?: string | null
          tribunal_orgao?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      projetos: {
        Row: {
          cliente_id: string
          created_at: string
          deploy_url: string | null
          documentacao_link: string | null
          escopo: string | null
          id: string
          links: string | null
          nome: string
          observacoes: string | null
          repositorio_git: string | null
          status: string | null
          tecnologias: string | null
          tipo: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          deploy_url?: string | null
          documentacao_link?: string | null
          escopo?: string | null
          id?: string
          links?: string | null
          nome: string
          observacoes?: string | null
          repositorio_git?: string | null
          status?: string | null
          tecnologias?: string | null
          tipo?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          deploy_url?: string | null
          documentacao_link?: string | null
          escopo?: string | null
          id?: string
          links?: string | null
          nome?: string
          observacoes?: string | null
          repositorio_git?: string | null
          status?: string | null
          tecnologias?: string | null
          tipo?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projetos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projetos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      propostas: {
        Row: {
          cliente_id: string | null
          created_at: string
          data_envio: string | null
          data_resposta: string | null
          descricao: string | null
          id: string
          lead_id: string | null
          observacoes: string | null
          status: string
          titulo: string
          user_id: string
          valor: number | null
          versao: number
          workspace_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          data_envio?: string | null
          data_resposta?: string | null
          descricao?: string | null
          id?: string
          lead_id?: string | null
          observacoes?: string | null
          status?: string
          titulo: string
          user_id?: string
          valor?: number | null
          versao?: number
          workspace_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          data_envio?: string | null
          data_resposta?: string | null
          descricao?: string | null
          id?: string
          lead_id?: string | null
          observacoes?: string | null
          status?: string
          titulo?: string
          user_id?: string
          valor?: number | null
          versao?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "propostas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      propriedade_intelectual: {
        Row: {
          cliente_id: string | null
          created_at: string
          data_registro: string | null
          data_renovacao: string | null
          id: string
          nome: string
          numero_registro: string | null
          observacoes: string | null
          orgao: string | null
          status: string
          tipo: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          data_registro?: string | null
          data_renovacao?: string | null
          id?: string
          nome: string
          numero_registro?: string | null
          observacoes?: string | null
          orgao?: string | null
          status?: string
          tipo?: string
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          data_registro?: string | null
          data_renovacao?: string | null
          id?: string
          nome?: string
          numero_registro?: string | null
          observacoes?: string | null
          orgao?: string | null
          status?: string
          tipo?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "propriedade_intelectual_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propriedade_intelectual_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      renegados: {
        Row: {
          abordado_por: string
          contato: string | null
          created_at: string
          data_abordagem: string | null
          descricao: string | null
          id: string
          insta_link: string | null
          motivo_negou: string | null
          nicho: string | null
          nome: string
          site_link: string | null
          tem_insta: boolean
          tem_site: boolean
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          abordado_por?: string
          contato?: string | null
          created_at?: string
          data_abordagem?: string | null
          descricao?: string | null
          id?: string
          insta_link?: string | null
          motivo_negou?: string | null
          nicho?: string | null
          nome: string
          site_link?: string | null
          tem_insta?: boolean
          tem_site?: boolean
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          abordado_por?: string
          contato?: string | null
          created_at?: string
          data_abordagem?: string | null
          descricao?: string | null
          id?: string
          insta_link?: string | null
          motivo_negou?: string | null
          nicho?: string | null
          nome?: string
          site_link?: string | null
          tem_insta?: boolean
          tem_site?: boolean
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "renegados_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      reunioes: {
        Row: {
          canal: string
          created_at: string
          data_hora: string
          duracao_min: number
          id: string
          lead_id: string
          local_link: string | null
          observacoes: string | null
          status: string
          updated_at: string
          vendedor_id: string | null
          workspace_id: string
        }
        Insert: {
          canal?: string
          created_at?: string
          data_hora: string
          duracao_min?: number
          id?: string
          lead_id: string
          local_link?: string | null
          observacoes?: string | null
          status?: string
          updated_at?: string
          vendedor_id?: string | null
          workspace_id: string
        }
        Update: {
          canal?: string
          created_at?: string
          data_hora?: string
          duracao_min?: number
          id?: string
          lead_id?: string
          local_link?: string | null
          observacoes?: string | null
          status?: string
          updated_at?: string
          vendedor_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reunioes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reunioes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos: {
        Row: {
          categoria: string | null
          cliente_id: string
          created_at: string
          data_inicio: string | null
          descricao: string | null
          id: string
          nome: string
          status: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          categoria?: string | null
          cliente_id: string
          created_at?: string
          data_inicio?: string | null
          descricao?: string | null
          id?: string
          nome: string
          status?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          categoria?: string | null
          cliente_id?: string
          created_at?: string
          data_inicio?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          status?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "servicos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_documento: {
        Row: {
          cliente_id: string
          created_at: string
          descricao: string | null
          documento_id: string | null
          id: string
          solicitante_id: string
          status: string
          titulo: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          descricao?: string | null
          documento_id?: string | null
          id?: string
          solicitante_id?: string
          status?: string
          titulo: string
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          descricao?: string | null
          documento_id?: string | null
          id?: string
          solicitante_id?: string
          status?: string
          titulo?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_documento_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_documento_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_documento_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_vendedor: {
        Row: {
          created_at: string
          email: string | null
          id: string
          respondido_em: string | null
          status: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          respondido_em?: string | null
          status?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          respondido_em?: string | null
          status?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_vendedor_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_respostas: {
        Row: {
          autor_id: string
          conteudo: string
          created_at: string
          id: string
          interna: boolean
          ticket_id: string
          workspace_id: string | null
        }
        Insert: {
          autor_id?: string
          conteudo: string
          created_at?: string
          id?: string
          interna?: boolean
          ticket_id: string
          workspace_id?: string | null
        }
        Update: {
          autor_id?: string
          conteudo?: string
          created_at?: string
          id?: string
          interna?: boolean
          ticket_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_respostas_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_respostas_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          categoria: string
          cliente_id: string | null
          created_at: string
          data_abertura: string
          data_primeira_resposta: string | null
          data_resolucao: string | null
          descricao: string | null
          id: string
          prioridade: string
          responsavel_id: string | null
          sla_horas: number | null
          status: string
          titulo: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          categoria?: string
          cliente_id?: string | null
          created_at?: string
          data_abertura?: string
          data_primeira_resposta?: string | null
          data_resolucao?: string | null
          descricao?: string | null
          id?: string
          prioridade?: string
          responsavel_id?: string | null
          sla_horas?: number | null
          status?: string
          titulo: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          categoria?: string
          cliente_id?: string | null
          created_at?: string
          data_abertura?: string
          data_primeira_resposta?: string | null
          data_resolucao?: string | null
          descricao?: string | null
          id?: string
          prioridade?: string
          responsavel_id?: string | null
          sla_horas?: number | null
          status?: string
          titulo?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      vagas: {
        Row: {
          created_at: string
          departamento_id: string | null
          descricao: string | null
          id: string
          requisitos: string | null
          salario_previsto: number | null
          status: string
          tipo_contrato: string | null
          titulo: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          departamento_id?: string | null
          descricao?: string | null
          id?: string
          requisitos?: string | null
          salario_previsto?: number | null
          status?: string
          tipo_contrato?: string | null
          titulo: string
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          departamento_id?: string | null
          descricao?: string | null
          id?: string
          requisitos?: string | null
          salario_previsto?: number | null
          status?: string
          tipo_contrato?: string | null
          titulo?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vagas_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vagas_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      vencimentos: {
        Row: {
          created_at: string
          data: string
          id: string
          nota: string | null
          titulo: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          data: string
          id?: string
          nota?: string | null
          titulo: string
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          nota?: string | null
          titulo?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vencimentos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_codigos: {
        Row: {
          codigo: string
          created_at: string
          workspace_id: string
        }
        Insert: {
          codigo: string
          created_at?: string
          workspace_id: string
        }
        Update: {
          codigo?: string
          created_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_codigos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_modulos: {
        Row: {
          config: Json
          habilitado: boolean
          habilitado_em: string
          modulo_chave: string
          workspace_id: string
        }
        Insert: {
          config?: Json
          habilitado?: boolean
          habilitado_em?: string
          modulo_chave: string
          workspace_id: string
        }
        Update: {
          config?: Json
          habilitado?: boolean
          habilitado_em?: string
          modulo_chave?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_modulos_modulo_chave_fkey"
            columns: ["modulo_chave"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["chave"]
          },
          {
            foreignKeyName: "workspace_modulos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aceitar_convite: { Args: { p_token: string }; Returns: string }
      agendar_reuniao: {
        Args: {
          p_canal?: string
          p_data_hora: string
          p_duracao_min?: number
          p_lead_id: string
          p_local_link?: string
          p_observacoes?: string
        }
        Returns: string
      }
      atualizar_reuniao: {
        Args: {
          p_data_hora?: string
          p_id: string
          p_observacoes?: string
          p_status?: string
        }
        Returns: undefined
      }
      converter_lead_em_cliente: {
        Args: { p_lead_id: string }
        Returns: string
      }
      criar_empresa: {
        Args: { p_nicho?: string; p_nome: string }
        Returns: string
      }
      current_user_email: { Args: never; Returns: string }
      definir_modulo: {
        Args: { p_chave: string; p_habilitado: boolean; p_workspace_id: string }
        Returns: undefined
      }
      eh_comercial_workspace: { Args: { p_ws: string }; Returns: boolean }
      eh_dono_workspace: { Args: { p_ws: string }; Returns: boolean }
      eh_membro_workspace: { Args: { ws: string }; Returns: boolean }
      gerar_codigo_vendedor: { Args: never; Returns: string }
      get_colaboradores_do_dono: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          membro_id: string
          nome: string
          papel: string
          status: string
        }[]
      }
      get_colaboradores_do_dono_by_id: {
        Args: { p_dono_id: string }
        Returns: {
          created_at: string
          email: string
          id: string
          membro_id: string
          nome: string
          papel: string
          status: string
        }[]
      }
      get_contas_vinculadas: {
        Args: never
        Returns: {
          dono_email: string
          dono_id: string
          dono_nome: string
          papel: string
        }[]
      }
      get_conversa_participante_info: {
        Args: { p_conversa_id: string }
        Returns: {
          email: string
          nome: string
          status: string
        }[]
      }
      get_convite_by_token: {
        Args: { p_token: string }
        Returns: {
          dono_nome: string
          email_convidado: string
          papel: string
          status: string
        }[]
      }
      lead_view_ping: { Args: { p_view_id: string }; Returns: undefined }
      lead_view_start: { Args: { p_lead_id: string }; Returns: string }
      meu_codigo_vendedor: { Args: { p_workspace_id: string }; Returns: string }
      meu_papel_na_empresa: {
        Args: { p_workspace_id: string }
        Returns: string
      }
      minhas_empresas: {
        Args: never
        Returns: {
          dono_id: string
          nome: string
          papel: string
          workspace_id: string
        }[]
      }
      modulo_habilitado: {
        Args: { p_chave: string; ws: string }
        Returns: boolean
      }
      recusar_convite: { Args: { p_token: string }; Returns: undefined }
      regenerar_codigo_vendedor: {
        Args: { p_workspace_id: string }
        Returns: string
      }
      relatorio_atividade_vendedores: {
        Args: { p_dias?: number; p_workspace_id: string }
        Returns: {
          aberturas: number
          convertido: boolean
          lead_atribuido_a: string
          lead_id: string
          lead_nome: string
          primeira_abertura: string
          tem_reuniao: boolean
          total_seg: number
          ultima_abertura: string
          vendedor_email: string
          vendedor_id: string
        }[]
      }
      renomear_empresa: {
        Args: { p_nome: string; p_workspace_id: string }
        Returns: undefined
      }
      responder_solicitacao_vendedor: {
        Args: { p_aprovar: boolean; p_id: string }
        Returns: undefined
      }
      solicitar_acesso_vendedor: { Args: { p_codigo: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
