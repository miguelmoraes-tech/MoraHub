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
      aprovacao_regras: {
        Row: {
          descricao: string
          exige: boolean
          tipo: string
        }
        Insert: {
          descricao: string
          exige?: boolean
          tipo: string
        }
        Update: {
          descricao?: string
          exige?: boolean
          tipo?: string
        }
        Relationships: []
      }
      aprovacoes: {
        Row: {
          created_at: string
          decidido_em: string | null
          erro: string | null
          expira_em: string
          id: string
          payload: Json
          proposto_por: string
          resultado: Json | null
          resumo: string
          status: string
          tipo: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          decidido_em?: string | null
          erro?: string | null
          expira_em?: string
          id?: string
          payload?: Json
          proposto_por: string
          resultado?: Json | null
          resumo: string
          status?: string
          tipo: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          decidido_em?: string | null
          erro?: string | null
          expira_em?: string
          id?: string
          payload?: Json
          proposto_por?: string
          resultado?: Json | null
          resumo?: string
          status?: string
          tipo?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aprovacoes_tipo_fkey"
            columns: ["tipo"]
            isOneToOne: false
            referencedRelation: "aprovacao_regras"
            referencedColumns: ["tipo"]
          },
          {
            foreignKeyName: "aprovacoes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      aprovacoes_votos: {
        Row: {
          aprovacao_id: string
          created_at: string
          user_id: string
          voto: boolean
        }
        Insert: {
          aprovacao_id: string
          created_at?: string
          user_id: string
          voto: boolean
        }
        Update: {
          aprovacao_id?: string
          created_at?: string
          user_id?: string
          voto?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "aprovacoes_votos_aprovacao_id_fkey"
            columns: ["aprovacao_id"]
            isOneToOne: false
            referencedRelation: "aprovacoes"
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
          permissoes: Json
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
          permissoes?: Json
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
          permissoes?: Json
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
      modelos: {
        Row: {
          ativo: boolean
          chave: string
          config: Json
          descricao: string | null
          id: string
          nicho_chave: string
          nome: string
          ordem: number
          semente: Json
        }
        Insert: {
          ativo?: boolean
          chave: string
          config?: Json
          descricao?: string | null
          id?: string
          nicho_chave: string
          nome: string
          ordem?: number
          semente?: Json
        }
        Update: {
          ativo?: boolean
          chave?: string
          config?: Json
          descricao?: string | null
          id?: string
          nicho_chave?: string
          nome?: string
          ordem?: number
          semente?: Json
        }
        Relationships: [
          {
            foreignKeyName: "modelos_nicho_chave_fkey"
            columns: ["nicho_chave"]
            isOneToOne: false
            referencedRelation: "nichos"
            referencedColumns: ["chave"]
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
          permite_membros: boolean
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
          permite_membros?: boolean
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
          permite_membros?: boolean
        }
        Relationships: []
      }
      nicho_modulos: {
        Row: {
          modulo_chave: string
          nicho_chave: string
          ordem: number
          recomendado: boolean
        }
        Insert: {
          modulo_chave: string
          nicho_chave: string
          ordem?: number
          recomendado?: boolean
        }
        Update: {
          modulo_chave?: string
          nicho_chave?: string
          ordem?: number
          recomendado?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "nicho_modulos_modulo_chave_fkey"
            columns: ["modulo_chave"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["chave"]
          },
          {
            foreignKeyName: "nicho_modulos_nicho_chave_fkey"
            columns: ["nicho_chave"]
            isOneToOne: false
            referencedRelation: "nichos"
            referencedColumns: ["chave"]
          },
        ]
      }
      nichos: {
        Row: {
          ativo: boolean
          chave: string
          config: Json
          created_at: string
          descricao: string | null
          icone: string | null
          nome: string
          ordem: number
        }
        Insert: {
          ativo?: boolean
          chave: string
          config?: Json
          created_at?: string
          descricao?: string | null
          icone?: string | null
          nome: string
          ordem?: number
        }
        Update: {
          ativo?: boolean
          chave?: string
          config?: Json
          created_at?: string
          descricao?: string | null
          icone?: string | null
          nome?: string
          ordem?: number
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
      p3d_compra_itens: {
        Row: {
          compra_id: string
          created_at: string
          id: string
          material_id: string
          observacao: string | null
          preco_total: number
          preco_unitario: number | null
          quantidade: number
          workspace_id: string
        }
        Insert: {
          compra_id: string
          created_at?: string
          id?: string
          material_id: string
          observacao?: string | null
          preco_total: number
          preco_unitario?: number | null
          quantidade: number
          workspace_id: string
        }
        Update: {
          compra_id?: string
          created_at?: string
          id?: string
          material_id?: string
          observacao?: string | null
          preco_total?: number
          preco_unitario?: number | null
          quantidade?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "p3d_compra_itens_compra_id_workspace_id_fkey"
            columns: ["compra_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "p3d_compras"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "p3d_compra_itens_material_id_workspace_id_fkey"
            columns: ["material_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "p3d_materiais"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
      }
      p3d_compras: {
        Row: {
          conta_pagar_id: string | null
          created_at: string
          data: string
          desconto: number
          fornecedor_id: string
          frete: number
          id: string
          numero: number
          observacoes: string | null
          prazo_entrega: string | null
          recebida_em: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string
          user_id: string
          validade_cotacao: string | null
          workspace_id: string
        }
        Insert: {
          conta_pagar_id?: string | null
          created_at?: string
          data?: string
          desconto?: number
          fornecedor_id: string
          frete?: number
          id?: string
          numero?: number
          observacoes?: string | null
          prazo_entrega?: string | null
          recebida_em?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
          validade_cotacao?: string | null
          workspace_id: string
        }
        Update: {
          conta_pagar_id?: string | null
          created_at?: string
          data?: string
          desconto?: number
          fornecedor_id?: string
          frete?: number
          id?: string
          numero?: number
          observacoes?: string | null
          prazo_entrega?: string | null
          recebida_em?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
          validade_cotacao?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "p3d_compras_fornecedor_id_workspace_id_fkey"
            columns: ["fornecedor_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "p3d_fornecedores"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "p3d_compras_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      p3d_config_alertas: {
        Row: {
          compra_pendente_dias: number
          estoque_baixo: boolean
          falhas_recorrentes_dias: number
          falhas_recorrentes_limite: number
          manutencao: boolean
          orcamento_validade: boolean
          pagamento_pendente_dias: number
          prazo_pedido_dias: number
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          compra_pendente_dias?: number
          estoque_baixo?: boolean
          falhas_recorrentes_dias?: number
          falhas_recorrentes_limite?: number
          manutencao?: boolean
          orcamento_validade?: boolean
          pagamento_pendente_dias?: number
          prazo_pedido_dias?: number
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          compra_pendente_dias?: number
          estoque_baixo?: boolean
          falhas_recorrentes_dias?: number
          falhas_recorrentes_limite?: number
          manutencao?: boolean
          orcamento_validade?: boolean
          pagamento_pendente_dias?: number
          prazo_pedido_dias?: number
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "p3d_config_alertas_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      p3d_config_precificacao: {
        Row: {
          arredondar_para: number
          base_custo_material: string
          comissao_pct: number
          desperdicio_pct: number
          despesas_fixas_pct: number
          falha_fracao_perdida: number
          falha_pct: number
          impostos_pct: number
          margem_pct: number
          markup_pct: number
          modo_preco: string
          preco_minimo: number
          tarifa_kwh: number
          taxa_fixa_pagamento: number
          taxa_pagamento_pct: number
          updated_at: string
          updated_by: string | null
          valor_hora_mao_obra: number
          workspace_id: string
        }
        Insert: {
          arredondar_para?: number
          base_custo_material?: string
          comissao_pct?: number
          desperdicio_pct?: number
          despesas_fixas_pct?: number
          falha_fracao_perdida?: number
          falha_pct?: number
          impostos_pct?: number
          margem_pct?: number
          markup_pct?: number
          modo_preco?: string
          preco_minimo?: number
          tarifa_kwh?: number
          taxa_fixa_pagamento?: number
          taxa_pagamento_pct?: number
          updated_at?: string
          updated_by?: string | null
          valor_hora_mao_obra?: number
          workspace_id: string
        }
        Update: {
          arredondar_para?: number
          base_custo_material?: string
          comissao_pct?: number
          desperdicio_pct?: number
          despesas_fixas_pct?: number
          falha_fracao_perdida?: number
          falha_pct?: number
          impostos_pct?: number
          margem_pct?: number
          markup_pct?: number
          modo_preco?: string
          preco_minimo?: number
          tarifa_kwh?: number
          taxa_fixa_pagamento?: number
          taxa_pagamento_pct?: number
          updated_at?: string
          updated_by?: string | null
          valor_hora_mao_obra?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "p3d_config_precificacao_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      p3d_envios: {
        Row: {
          codigo_rastreio: string | null
          created_at: string
          custo_frete: number
          entregue_em: string | null
          id: string
          observacoes: string | null
          pedido_id: string
          peso_kg: number | null
          postado_em: string | null
          previsao_entrega: string | null
          recebedor: string | null
          servico: string | null
          status: string
          transportadora: string | null
          updated_at: string
          url_rastreio: string | null
          user_id: string
          volumes: number
          workspace_id: string
        }
        Insert: {
          codigo_rastreio?: string | null
          created_at?: string
          custo_frete?: number
          entregue_em?: string | null
          id?: string
          observacoes?: string | null
          pedido_id: string
          peso_kg?: number | null
          postado_em?: string | null
          previsao_entrega?: string | null
          recebedor?: string | null
          servico?: string | null
          status?: string
          transportadora?: string | null
          updated_at?: string
          url_rastreio?: string | null
          user_id?: string
          volumes?: number
          workspace_id: string
        }
        Update: {
          codigo_rastreio?: string | null
          created_at?: string
          custo_frete?: number
          entregue_em?: string | null
          id?: string
          observacoes?: string | null
          pedido_id?: string
          peso_kg?: number | null
          postado_em?: string | null
          previsao_entrega?: string | null
          recebedor?: string | null
          servico?: string | null
          status?: string
          transportadora?: string | null
          updated_at?: string
          url_rastreio?: string | null
          user_id?: string
          volumes?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "p3d_envios_pedido_id_workspace_id_fkey"
            columns: ["pedido_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "p3d_pedidos"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "p3d_envios_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      p3d_falhas: {
        Row: {
          baixou_estoque: boolean
          created_at: string
          custo_maquina_estimado: number
          custo_material: number
          descricao: string | null
          horas_perdidas: number
          id: string
          impressora_id: string | null
          material_id: string | null
          peso_perdido_g: number
          producao_id: string
          produto_id: string | null
          reimpressao_producao_id: string | null
          tipo_defeito: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          baixou_estoque?: boolean
          created_at?: string
          custo_maquina_estimado?: number
          custo_material?: number
          descricao?: string | null
          horas_perdidas?: number
          id?: string
          impressora_id?: string | null
          material_id?: string | null
          peso_perdido_g?: number
          producao_id: string
          produto_id?: string | null
          reimpressao_producao_id?: string | null
          tipo_defeito: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          baixou_estoque?: boolean
          created_at?: string
          custo_maquina_estimado?: number
          custo_material?: number
          descricao?: string | null
          horas_perdidas?: number
          id?: string
          impressora_id?: string | null
          material_id?: string | null
          peso_perdido_g?: number
          producao_id?: string
          produto_id?: string | null
          reimpressao_producao_id?: string | null
          tipo_defeito?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "p3d_falhas_impressora_id_workspace_id_fkey"
            columns: ["impressora_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "p3d_impressoras"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "p3d_falhas_material_id_workspace_id_fkey"
            columns: ["material_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "p3d_materiais"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "p3d_falhas_producao_id_workspace_id_fkey"
            columns: ["producao_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "p3d_producao"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "p3d_falhas_produto_id_workspace_id_fkey"
            columns: ["produto_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "p3d_produtos"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
      }
      p3d_fornecedores: {
        Row: {
          ativo: boolean
          categoria: string | null
          contato: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          site: string | null
          telefone: string | null
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          contato?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          site?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string
          workspace_id: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          contato?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          site?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "p3d_fornecedores_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      p3d_impressoras: {
        Row: {
          ativo: boolean
          bico_mm: number | null
          created_at: string
          data_aquisicao: string | null
          horas_ultima_manutencao: number
          horas_uso: number
          id: string
          integracao_tipo: string | null
          integracao_url: string | null
          intervalo_manutencao_horas: number | null
          manutencao_ciclo: number
          manutencao_hora: number
          marca: string | null
          modelo: string | null
          nome: string
          observacoes: string | null
          potencia_media_kw: number
          status: string
          tecnologia: string
          updated_at: string
          user_id: string
          valor_aquisicao: number
          valor_residual: number
          vida_util_horas: number
          volume_x_mm: number | null
          volume_y_mm: number | null
          volume_z_mm: number | null
          workspace_id: string
        }
        Insert: {
          ativo?: boolean
          bico_mm?: number | null
          created_at?: string
          data_aquisicao?: string | null
          horas_ultima_manutencao?: number
          horas_uso?: number
          id?: string
          integracao_tipo?: string | null
          integracao_url?: string | null
          intervalo_manutencao_horas?: number | null
          manutencao_ciclo?: number
          manutencao_hora?: number
          marca?: string | null
          modelo?: string | null
          nome: string
          observacoes?: string | null
          potencia_media_kw?: number
          status?: string
          tecnologia?: string
          updated_at?: string
          user_id?: string
          valor_aquisicao?: number
          valor_residual?: number
          vida_util_horas?: number
          volume_x_mm?: number | null
          volume_y_mm?: number | null
          volume_z_mm?: number | null
          workspace_id: string
        }
        Update: {
          ativo?: boolean
          bico_mm?: number | null
          created_at?: string
          data_aquisicao?: string | null
          horas_ultima_manutencao?: number
          horas_uso?: number
          id?: string
          integracao_tipo?: string | null
          integracao_url?: string | null
          intervalo_manutencao_horas?: number | null
          manutencao_ciclo?: number
          manutencao_hora?: number
          marca?: string | null
          modelo?: string | null
          nome?: string
          observacoes?: string | null
          potencia_media_kw?: number
          status?: string
          tecnologia?: string
          updated_at?: string
          user_id?: string
          valor_aquisicao?: number
          valor_residual?: number
          vida_util_horas?: number
          volume_x_mm?: number | null
          volume_y_mm?: number | null
          volume_z_mm?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "p3d_impressoras_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      p3d_inspecoes: {
        Row: {
          created_at: string
          defeitos: string[]
          id: string
          observacoes: string | null
          producao_id: string
          resultado: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          defeitos?: string[]
          id?: string
          observacoes?: string | null
          producao_id: string
          resultado: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          defeitos?: string[]
          id?: string
          observacoes?: string | null
          producao_id?: string
          resultado?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "p3d_inspecoes_producao_id_workspace_id_fkey"
            columns: ["producao_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "p3d_producao"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
      }
      p3d_integracoes: {
        Row: {
          ativo: boolean
          config: Json
          created_at: string
          id: string
          segredo_configurado: boolean
          status: string
          tipo: string
          ultima_verificacao: string | null
          ultimo_erro: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          ativo?: boolean
          config?: Json
          created_at?: string
          id?: string
          segredo_configurado?: boolean
          status?: string
          tipo: string
          ultima_verificacao?: string | null
          ultimo_erro?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          ativo?: boolean
          config?: Json
          created_at?: string
          id?: string
          segredo_configurado?: boolean
          status?: string
          tipo?: string
          ultima_verificacao?: string | null
          ultimo_erro?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "p3d_integracoes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      p3d_manutencoes: {
        Row: {
          created_at: string
          custo: number
          data: string
          descricao: string
          horas_uso_no_momento: number | null
          id: string
          impressora_id: string
          tipo: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          custo?: number
          data?: string
          descricao: string
          horas_uso_no_momento?: number | null
          id?: string
          impressora_id: string
          tipo?: string
          user_id?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          custo?: number
          data?: string
          descricao?: string
          horas_uso_no_momento?: number | null
          id?: string
          impressora_id?: string
          tipo?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "p3d_manutencoes_impressora_id_workspace_id_fkey"
            columns: ["impressora_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "p3d_impressoras"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
      }
      p3d_materiais: {
        Row: {
          ativo: boolean
          cor: string | null
          cor_hex: string | null
          created_at: string
          custo_cadastro: number | null
          custo_medio: number
          diametro_mm: number | null
          estoque_atual: number
          estoque_minimo: number
          fornecedor_id: string | null
          id: string
          localizacao: string | null
          marca: string | null
          material: string | null
          nome: string
          peso_liquido_rolo_g: number | null
          preco_compra: number | null
          tipo: string
          ultimo_custo: number
          unidade: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          ativo?: boolean
          cor?: string | null
          cor_hex?: string | null
          created_at?: string
          custo_cadastro?: number | null
          custo_medio?: number
          diametro_mm?: number | null
          estoque_atual?: number
          estoque_minimo?: number
          fornecedor_id?: string | null
          id?: string
          localizacao?: string | null
          marca?: string | null
          material?: string | null
          nome: string
          peso_liquido_rolo_g?: number | null
          preco_compra?: number | null
          tipo?: string
          ultimo_custo?: number
          unidade?: string
          updated_at?: string
          user_id?: string
          workspace_id: string
        }
        Update: {
          ativo?: boolean
          cor?: string | null
          cor_hex?: string | null
          created_at?: string
          custo_cadastro?: number | null
          custo_medio?: number
          diametro_mm?: number | null
          estoque_atual?: number
          estoque_minimo?: number
          fornecedor_id?: string | null
          id?: string
          localizacao?: string | null
          marca?: string | null
          material?: string | null
          nome?: string
          peso_liquido_rolo_g?: number | null
          preco_compra?: number | null
          tipo?: string
          ultimo_custo?: number
          unidade?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "p3d_materiais_fornecedor_fk"
            columns: ["fornecedor_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "p3d_fornecedores"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "p3d_materiais_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      p3d_movimentos_estoque: {
        Row: {
          created_at: string
          custo_total: number | null
          custo_unitario: number | null
          delta: number
          id: string
          material_id: string
          observacao: string | null
          referencia_id: string | null
          referencia_tipo: string | null
          saldo_apos: number
          tipo: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          custo_total?: number | null
          custo_unitario?: number | null
          delta: number
          id?: string
          material_id: string
          observacao?: string | null
          referencia_id?: string | null
          referencia_tipo?: string | null
          saldo_apos: number
          tipo: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          custo_total?: number | null
          custo_unitario?: number | null
          delta?: number
          id?: string
          material_id?: string
          observacao?: string | null
          referencia_id?: string | null
          referencia_tipo?: string | null
          saldo_apos?: number
          tipo?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "p3d_movimentos_estoque_material_id_workspace_id_fkey"
            columns: ["material_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "p3d_materiais"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
      }
      p3d_notificacoes: {
        Row: {
          chave: string
          created_at: string
          id: string
          lida_em: string | null
          lida_por: string | null
          mensagem: string | null
          referencia_id: string | null
          referencia_tipo: string | null
          resolvida_em: string | null
          severidade: string
          tipo: string
          titulo: string
          workspace_id: string
        }
        Insert: {
          chave: string
          created_at?: string
          id?: string
          lida_em?: string | null
          lida_por?: string | null
          mensagem?: string | null
          referencia_id?: string | null
          referencia_tipo?: string | null
          resolvida_em?: string | null
          severidade?: string
          tipo: string
          titulo: string
          workspace_id: string
        }
        Update: {
          chave?: string
          created_at?: string
          id?: string
          lida_em?: string | null
          lida_por?: string | null
          mensagem?: string | null
          referencia_id?: string | null
          referencia_tipo?: string | null
          resolvida_em?: string | null
          severidade?: string
          tipo?: string
          titulo?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "p3d_notificacoes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      p3d_orcamento_itens: {
        Row: {
          calculado_em: string
          calculo: Json
          custo_total: number
          descricao: string
          entrada: Json
          id: string
          lucro: number
          orcamento_id: string
          ordem: number
          preco_total: number
          preco_unitario: number
          produto_id: string | null
          quantidade: number
          variacao_id: string | null
          versao_formula: number
          workspace_id: string
        }
        Insert: {
          calculado_em?: string
          calculo: Json
          custo_total: number
          descricao: string
          entrada: Json
          id?: string
          lucro: number
          orcamento_id: string
          ordem?: number
          preco_total: number
          preco_unitario: number
          produto_id?: string | null
          quantidade: number
          variacao_id?: string | null
          versao_formula?: number
          workspace_id: string
        }
        Update: {
          calculado_em?: string
          calculo?: Json
          custo_total?: number
          descricao?: string
          entrada?: Json
          id?: string
          lucro?: number
          orcamento_id?: string
          ordem?: number
          preco_total?: number
          preco_unitario?: number
          produto_id?: string | null
          quantidade?: number
          variacao_id?: string | null
          versao_formula?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "p3d_orcamento_itens_orcamento_id_workspace_id_fkey"
            columns: ["orcamento_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "p3d_orcamentos"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "p3d_orcamento_itens_produto_id_workspace_id_fkey"
            columns: ["produto_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "p3d_produtos"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "p3d_orcamento_itens_variacao_id_workspace_id_fkey"
            columns: ["variacao_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "p3d_produto_variacoes"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
      }
      p3d_orcamentos: {
        Row: {
          aprovado_em: string | null
          cliente_id: string | null
          created_at: string
          custo_total: number
          desconto_valor: number
          enviado_em: string | null
          id: string
          lucro_total: number
          numero: number
          observacoes: string | null
          status: string
          subtotal: number
          titulo: string
          total: number
          updated_at: string
          user_id: string
          validade: string | null
          workspace_id: string
        }
        Insert: {
          aprovado_em?: string | null
          cliente_id?: string | null
          created_at?: string
          custo_total?: number
          desconto_valor?: number
          enviado_em?: string | null
          id?: string
          lucro_total?: number
          numero?: number
          observacoes?: string | null
          status?: string
          subtotal?: number
          titulo: string
          total?: number
          updated_at?: string
          user_id?: string
          validade?: string | null
          workspace_id: string
        }
        Update: {
          aprovado_em?: string | null
          cliente_id?: string | null
          created_at?: string
          custo_total?: number
          desconto_valor?: number
          enviado_em?: string | null
          id?: string
          lucro_total?: number
          numero?: number
          observacoes?: string | null
          status?: string
          subtotal?: number
          titulo?: string
          total?: number
          updated_at?: string
          user_id?: string
          validade?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "p3d_orcamentos_cliente_id_workspace_id_fkey"
            columns: ["cliente_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "p3d_orcamentos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      p3d_pecas_desgaste: {
        Row: {
          categoria: string
          created_at: string
          custo: number
          horas_ultima_troca: number
          id: string
          impressora_id: string
          nome: string
          vida_util_horas: number
          workspace_id: string
        }
        Insert: {
          categoria?: string
          created_at?: string
          custo: number
          horas_ultima_troca?: number
          id?: string
          impressora_id: string
          nome: string
          vida_util_horas: number
          workspace_id: string
        }
        Update: {
          categoria?: string
          created_at?: string
          custo?: number
          horas_ultima_troca?: number
          id?: string
          impressora_id?: string
          nome?: string
          vida_util_horas?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "p3d_pecas_desgaste_impressora_id_workspace_id_fkey"
            columns: ["impressora_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "p3d_impressoras"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
      }
      p3d_pedido_historico: {
        Row: {
          created_at: string
          de: string | null
          id: string
          motivo: string | null
          para: string
          pedido_id: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          de?: string | null
          id?: string
          motivo?: string | null
          para: string
          pedido_id: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          de?: string | null
          id?: string
          motivo?: string | null
          para?: string
          pedido_id?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "p3d_pedido_historico_pedido_id_workspace_id_fkey"
            columns: ["pedido_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "p3d_pedidos"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
      }
      p3d_pedido_itens: {
        Row: {
          calculo: Json | null
          created_at: string
          custo_total: number
          custo_unitario: number
          descricao: string
          entrada: Json | null
          id: string
          lucro: number
          orcamento_item_id: string | null
          ordem: number
          origem: string
          pedido_id: string
          preco_total: number
          preco_unitario: number
          produto_id: string | null
          quantidade: number
          variacao_id: string | null
          workspace_id: string
        }
        Insert: {
          calculo?: Json | null
          created_at?: string
          custo_total?: number
          custo_unitario?: number
          descricao: string
          entrada?: Json | null
          id?: string
          lucro?: number
          orcamento_item_id?: string | null
          ordem?: number
          origem?: string
          pedido_id: string
          preco_total?: number
          preco_unitario: number
          produto_id?: string | null
          quantidade: number
          variacao_id?: string | null
          workspace_id: string
        }
        Update: {
          calculo?: Json | null
          created_at?: string
          custo_total?: number
          custo_unitario?: number
          descricao?: string
          entrada?: Json | null
          id?: string
          lucro?: number
          orcamento_item_id?: string | null
          ordem?: number
          origem?: string
          pedido_id?: string
          preco_total?: number
          preco_unitario?: number
          produto_id?: string | null
          quantidade?: number
          variacao_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "p3d_pedido_itens_pedido_id_workspace_id_fkey"
            columns: ["pedido_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "p3d_pedidos"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "p3d_pedido_itens_produto_id_workspace_id_fkey"
            columns: ["produto_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "p3d_produtos"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "p3d_pedido_itens_variacao_id_workspace_id_fkey"
            columns: ["variacao_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "p3d_produto_variacoes"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
      }
      p3d_pedido_pagamentos: {
        Row: {
          conta_receber_id: string | null
          created_at: string
          data: string
          forma: string
          id: string
          observacao: string | null
          pedido_id: string
          tipo: string
          user_id: string | null
          valor: number
          workspace_id: string
        }
        Insert: {
          conta_receber_id?: string | null
          created_at?: string
          data?: string
          forma?: string
          id?: string
          observacao?: string | null
          pedido_id: string
          tipo?: string
          user_id?: string | null
          valor: number
          workspace_id: string
        }
        Update: {
          conta_receber_id?: string | null
          created_at?: string
          data?: string
          forma?: string
          id?: string
          observacao?: string | null
          pedido_id?: string
          tipo?: string
          user_id?: string | null
          valor?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "p3d_pedido_pagamentos_pedido_id_workspace_id_fkey"
            columns: ["pedido_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "p3d_pedidos"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
      }
      p3d_pedidos: {
        Row: {
          cancelado_em: string | null
          cancelado_motivo: string | null
          cliente_avulso: string | null
          cliente_id: string | null
          created_at: string
          custo_total: number
          data_pedido: string
          desconto_valor: number
          frete_valor: number
          id: string
          lucro_total: number
          numero: number
          observacoes: string | null
          orcamento_id: string | null
          origem: string
          pago_valor: number
          prazo_entrega: string | null
          prioridade: string
          status: string
          status_pagamento: string
          subtotal: number
          total: number
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          cancelado_em?: string | null
          cancelado_motivo?: string | null
          cliente_avulso?: string | null
          cliente_id?: string | null
          created_at?: string
          custo_total?: number
          data_pedido?: string
          desconto_valor?: number
          frete_valor?: number
          id?: string
          lucro_total?: number
          numero?: number
          observacoes?: string | null
          orcamento_id?: string | null
          origem?: string
          pago_valor?: number
          prazo_entrega?: string | null
          prioridade?: string
          status?: string
          status_pagamento?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
          workspace_id: string
        }
        Update: {
          cancelado_em?: string | null
          cancelado_motivo?: string | null
          cliente_avulso?: string | null
          cliente_id?: string | null
          created_at?: string
          custo_total?: number
          data_pedido?: string
          desconto_valor?: number
          frete_valor?: number
          id?: string
          lucro_total?: number
          numero?: number
          observacoes?: string | null
          orcamento_id?: string | null
          origem?: string
          pago_valor?: number
          prazo_entrega?: string | null
          prioridade?: string
          status?: string
          status_pagamento?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "p3d_pedidos_cliente_id_workspace_id_fkey"
            columns: ["cliente_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "p3d_pedidos_orcamento_id_workspace_id_fkey"
            columns: ["orcamento_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "p3d_orcamentos"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "p3d_pedidos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      p3d_producao: {
        Row: {
          arquivo_id: string | null
          concluido_em: string | null
          consumo_registrado_em: string | null
          created_at: string
          descricao: string
          horas_estimadas: number | null
          horas_reais: number | null
          id: string
          impressora_id: string | null
          iniciado_em: string | null
          material_id: string | null
          numero: number
          observacoes: string | null
          pedido_id: string | null
          pedido_item_id: string | null
          peso_estimado_g: number | null
          peso_real_g: number | null
          prazo: string | null
          prioridade: string
          produto_id: string | null
          qualidade: string
          quantidade: number
          reimpressao_de: string | null
          status: string
          updated_at: string
          user_id: string
          variacao_id: string | null
          workspace_id: string
        }
        Insert: {
          arquivo_id?: string | null
          concluido_em?: string | null
          consumo_registrado_em?: string | null
          created_at?: string
          descricao: string
          horas_estimadas?: number | null
          horas_reais?: number | null
          id?: string
          impressora_id?: string | null
          iniciado_em?: string | null
          material_id?: string | null
          numero?: number
          observacoes?: string | null
          pedido_id?: string | null
          pedido_item_id?: string | null
          peso_estimado_g?: number | null
          peso_real_g?: number | null
          prazo?: string | null
          prioridade?: string
          produto_id?: string | null
          qualidade?: string
          quantidade?: number
          reimpressao_de?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          variacao_id?: string | null
          workspace_id: string
        }
        Update: {
          arquivo_id?: string | null
          concluido_em?: string | null
          consumo_registrado_em?: string | null
          created_at?: string
          descricao?: string
          horas_estimadas?: number | null
          horas_reais?: number | null
          id?: string
          impressora_id?: string | null
          iniciado_em?: string | null
          material_id?: string | null
          numero?: number
          observacoes?: string | null
          pedido_id?: string | null
          pedido_item_id?: string | null
          peso_estimado_g?: number | null
          peso_real_g?: number | null
          prazo?: string | null
          prioridade?: string
          produto_id?: string | null
          qualidade?: string
          quantidade?: number
          reimpressao_de?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          variacao_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "p3d_producao_arquivo_id_workspace_id_fkey"
            columns: ["arquivo_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "p3d_produto_arquivos"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "p3d_producao_impressora_id_workspace_id_fkey"
            columns: ["impressora_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "p3d_impressoras"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "p3d_producao_material_id_workspace_id_fkey"
            columns: ["material_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "p3d_materiais"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "p3d_producao_pedido_id_workspace_id_fkey"
            columns: ["pedido_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "p3d_pedidos"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "p3d_producao_pedido_item_id_workspace_id_fkey"
            columns: ["pedido_item_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "p3d_pedido_itens"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "p3d_producao_produto_id_workspace_id_fkey"
            columns: ["produto_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "p3d_produtos"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "p3d_producao_reimpressao_de_workspace_id_fkey"
            columns: ["reimpressao_de", "workspace_id"]
            isOneToOne: false
            referencedRelation: "p3d_producao"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "p3d_producao_variacao_id_workspace_id_fkey"
            columns: ["variacao_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "p3d_produto_variacoes"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "p3d_producao_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      p3d_produto_arquivos: {
        Row: {
          created_at: string
          id: string
          mime_type: string | null
          nome: string
          produto_id: string
          storage_path: string
          tamanho_bytes: number | null
          tipo: string
          user_id: string | null
          variacao_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mime_type?: string | null
          nome: string
          produto_id: string
          storage_path: string
          tamanho_bytes?: number | null
          tipo: string
          user_id?: string | null
          variacao_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mime_type?: string | null
          nome?: string
          produto_id?: string
          storage_path?: string
          tamanho_bytes?: number | null
          tipo?: string
          user_id?: string | null
          variacao_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "p3d_produto_arquivos_produto_id_workspace_id_fkey"
            columns: ["produto_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "p3d_produtos"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "p3d_produto_arquivos_variacao_id_workspace_id_fkey"
            columns: ["variacao_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "p3d_produto_variacoes"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
      }
      p3d_produto_variacoes: {
        Row: {
          ativo: boolean
          cor: string | null
          created_at: string
          horas_estimadas: number | null
          id: string
          material_id: string | null
          nome: string
          peso_g: number | null
          preco_venda: number | null
          produto_id: string
          sku: string | null
          tamanho: string | null
          workspace_id: string
        }
        Insert: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          horas_estimadas?: number | null
          id?: string
          material_id?: string | null
          nome: string
          peso_g?: number | null
          preco_venda?: number | null
          produto_id: string
          sku?: string | null
          tamanho?: string | null
          workspace_id: string
        }
        Update: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          horas_estimadas?: number | null
          id?: string
          material_id?: string | null
          nome?: string
          peso_g?: number | null
          preco_venda?: number | null
          produto_id?: string
          sku?: string | null
          tamanho?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "p3d_produto_variacoes_material_id_workspace_id_fkey"
            columns: ["material_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "p3d_materiais"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "p3d_produto_variacoes_produto_id_workspace_id_fkey"
            columns: ["produto_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "p3d_produtos"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
      }
      p3d_produtos: {
        Row: {
          ativo: boolean
          categoria: string | null
          created_at: string
          descricao: string | null
          horas_estimadas: number | null
          id: string
          impressora_id: string | null
          material_id: string | null
          nome: string
          peso_estimado_g: number | null
          preco_venda: number | null
          publicado_loja: boolean
          sku: string | null
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          horas_estimadas?: number | null
          id?: string
          impressora_id?: string | null
          material_id?: string | null
          nome: string
          peso_estimado_g?: number | null
          preco_venda?: number | null
          publicado_loja?: boolean
          sku?: string | null
          updated_at?: string
          user_id?: string
          workspace_id: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          horas_estimadas?: number | null
          id?: string
          impressora_id?: string | null
          material_id?: string | null
          nome?: string
          peso_estimado_g?: number | null
          preco_venda?: number | null
          publicado_loja?: boolean
          sku?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "p3d_produtos_impressora_id_workspace_id_fkey"
            columns: ["impressora_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "p3d_impressoras"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "p3d_produtos_material_id_workspace_id_fkey"
            columns: ["material_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "p3d_materiais"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "p3d_produtos_workspace_id_fkey"
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
      perfis_acesso: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          permissoes: Json
          workspace_id: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          permissoes?: Json
          workspace_id: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          permissoes?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfis_acesso_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
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
      permissoes_membro: {
        Row: {
          created_at: string
          extras: string[]
          membro_id: string
          modulo_chave: string
          nivel: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          extras?: string[]
          membro_id: string
          modulo_chave: string
          nivel: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          extras?: string[]
          membro_id?: string
          modulo_chave?: string
          nivel?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permissoes_membro_modulo_chave_fkey"
            columns: ["modulo_chave"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["chave"]
          },
          {
            foreignKeyName: "permissoes_membro_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "perfis_tipos_ativos"
            referencedColumns: ["id"]
          },
        ]
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
          perfil_acesso_id: string | null
          respondido_em: string | null
          status: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          perfil_acesso_id?: string | null
          respondido_em?: string | null
          status?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          perfil_acesso_id?: string | null
          respondido_em?: string | null
          status?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_vendedor_perfil_acesso_id_fkey"
            columns: ["perfil_acesso_id"]
            isOneToOne: false
            referencedRelation: "perfis_acesso"
            referencedColumns: ["id"]
          },
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
      workspace_config: {
        Row: {
          config: Json
          modelo_id: string | null
          nicho_chave: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          config?: Json
          modelo_id?: string | null
          nicho_chave?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          config?: Json
          modelo_id?: string | null
          nicho_chave?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_config_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "modelos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_config_nicho_chave_fkey"
            columns: ["nicho_chave"]
            isOneToOne: false
            referencedRelation: "nichos"
            referencedColumns: ["chave"]
          },
          {
            foreignKeyName: "workspace_config_workspace_id_fkey"
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
      p3d_historico_precos: {
        Row: {
          compra_id: string | null
          compra_numero: number | null
          compra_status: string | null
          data: string | null
          fornecedor_id: string | null
          material_id: string | null
          preco_total: number | null
          preco_unitario: number | null
          quantidade: number | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "p3d_compra_itens_material_id_workspace_id_fkey"
            columns: ["material_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "p3d_materiais"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
      }
    }
    Functions: {
      _executar_aprovacao: {
        Args: { a: Database["public"]["Tables"]["aprovacoes"]["Row"] }
        Returns: Json
      }
      _finalizar_se_completa: { Args: { p_id: string }; Returns: string }
      _fundadores: { Args: { p_ws: string }; Returns: string[] }
      _gate: {
        Args: {
          p_payload: Json
          p_resumo: string
          p_tipo: string
          p_ws: string
        }
        Returns: boolean
      }
      _validar_permissoes: {
        Args: { p_permissoes: Json; p_ws: string }
        Returns: Json
      }
      aceitar_convite: { Args: { p_token: string }; Returns: string }
      aceitar_convite_workspace: { Args: { p_token: string }; Returns: string }
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
      aplicar_nicho: {
        Args: { p_modelo?: string; p_nicho: string; p_workspace_id: string }
        Returns: undefined
      }
      aprovar_alteracao: {
        Args: { p_aprovar: boolean; p_id: string }
        Returns: string
      }
      atualizar_perfil_acesso: {
        Args: {
          p_ativo?: boolean
          p_descricao?: string
          p_id: string
          p_nome?: string
          p_permissoes?: Json
        }
        Returns: undefined
      }
      atualizar_permissoes_membro: {
        Args: {
          p_membro_id: string
          p_permissoes: Json
          p_workspace_id: string
        }
        Returns: undefined
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
      cancelar_alteracao: { Args: { p_id: string }; Returns: undefined }
      cancelar_convite_empresa: { Args: { p_id: string }; Returns: undefined }
      converter_lead_em_cliente: {
        Args: { p_lead_id: string }
        Returns: string
      }
      convidar_membro: {
        Args: {
          p_email: string
          p_papel: string
          p_permissoes?: Json
          p_workspace_id: string
        }
        Returns: string
      }
      criar_empresa: {
        Args: { p_nicho?: string; p_nome: string }
        Returns: string
      }
      criar_perfil_acesso: {
        Args: {
          p_descricao?: string
          p_nome: string
          p_permissoes?: Json
          p_workspace_id: string
        }
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
      eh_proprietario_workspace: { Args: { p_ws: string }; Returns: boolean }
      fundadores_da_empresa: {
        Args: { p_workspace_id: string }
        Returns: {
          email: string
          nome: string
          papel: string
          user_id: string
        }[]
      }
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
      listar_aprovacoes: {
        Args: { p_workspace_id: string }
        Returns: {
          created_at: string
          decidido_em: string
          erro: string
          eu_posso_votar: boolean
          expira_em: string
          faltam: Json
          id: string
          proposto_por: string
          proposto_por_nome: string
          resultado: Json
          resumo: string
          status: string
          tipo: string
          votos: Json
        }[]
      }
      listar_convites_empresa: {
        Args: { p_workspace_id: string }
        Returns: {
          created_at: string
          email_convidado: string
          expira_em: string
          id: string
          papel: string
          permissoes: Json
        }[]
      }
      listar_membros_empresa: {
        Args: { p_workspace_id: string }
        Returns: {
          created_at: string
          email: string
          membro_id: string
          nome: string
          papel: string
          permissoes: Json
        }[]
      }
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
      p3d_alertas_calculados: {
        Args: { p_ws: string }
        Returns: {
          chave: string
          mensagem: string
          ref_id: string
          ref_tipo: string
          severidade: string
          tipo: string
          titulo: string
        }[]
      }
      p3d_atualizar_alertas: { Args: { p_ws: string }; Returns: number }
      p3d_calcular_preco: { Args: { p: Json }; Returns: Json }
      p3d_cancelar_producao: {
        Args: { p_motivo: string; p_producao_id: string }
        Returns: undefined
      }
      p3d_concluir_producao: {
        Args: {
          p_horas_reais: number
          p_material_id?: string
          p_observacao?: string
          p_peso_real_g: number
          p_producao_id: string
        }
        Returns: Json
      }
      p3d_criar_pedido_de_orcamento: {
        Args: {
          p_orcamento_id: string
          p_prazo?: string
          p_prioridade?: string
        }
        Returns: string
      }
      p3d_estoque_aplicar: {
        Args: {
          p_custo_total: number
          p_custo_unitario: number
          p_material_id: string
          p_observacao: string
          p_permitir_negativo: boolean
          p_quantidade: number
          p_referencia_id: string
          p_referencia_tipo: string
          p_tipo: string
          p_ws: string
        }
        Returns: Json
      }
      p3d_garantir_config: { Args: { p_ws: string }; Returns: undefined }
      p3d_gerar_alertas_interno: { Args: { p_ws: string }; Returns: number }
      p3d_gerar_producao_do_pedido: {
        Args: { p_pedido_id: string }
        Returns: number
      }
      p3d_iniciar_producao: {
        Args: { p_impressora_id?: string; p_producao_id: string }
        Returns: Json
      }
      p3d_marcar_notificacao: {
        Args: { p_id: string; p_lida?: boolean }
        Returns: undefined
      }
      p3d_movimentar_estoque: {
        Args: {
          p_custo_total?: number
          p_custo_unitario?: number
          p_material_id: string
          p_observacao?: string
          p_permitir_negativo?: boolean
          p_quantidade: number
          p_referencia_id?: string
          p_referencia_tipo?: string
          p_tipo: string
          p_ws: string
        }
        Returns: Json
      }
      p3d_mudar_status_compra: {
        Args: { p_compra_id: string; p_status: string }
        Returns: string
      }
      p3d_mudar_status_envio: {
        Args: {
          p_data?: string
          p_envio_id: string
          p_recebedor?: string
          p_status: string
        }
        Returns: string
      }
      p3d_mudar_status_orcamento: {
        Args: { p_orcamento_id: string; p_status: string }
        Returns: string
      }
      p3d_mudar_status_pedido: {
        Args: { p_motivo?: string; p_pedido_id: string; p_status: string }
        Returns: string
      }
      p3d_num: { Args: { d?: number; k: string; p: Json }; Returns: number }
      p3d_painel: {
        Args: { p_ate?: string; p_de?: string; p_ws: string }
        Returns: Json
      }
      p3d_pedido_set_status: {
        Args: {
          p_motivo: string
          p_para: string
          p_pedido: string
          p_ws: string
        }
        Returns: undefined
      }
      p3d_recalc_compra: { Args: { p_id: string }; Returns: undefined }
      p3d_recalc_orcamento: { Args: { p_id: string }; Returns: undefined }
      p3d_recalc_pedido: { Args: { p_id: string }; Returns: undefined }
      p3d_receber_compra: {
        Args: {
          p_compra_id: string
          p_gerar_conta_pagar?: boolean
          p_vencimento?: string
        }
        Returns: Json
      }
      p3d_registrar_falha: {
        Args: {
          p_descricao?: string
          p_horas_perdidas: number
          p_peso_perdido_g: number
          p_producao_id: string
          p_quantidade_afetada?: number
          p_reimprimir?: boolean
          p_tipo_defeito: string
        }
        Returns: Json
      }
      p3d_registrar_inspecao: {
        Args: {
          p_acao?: string
          p_defeitos?: string[]
          p_observacoes?: string
          p_producao_id: string
          p_resultado: string
        }
        Returns: Json
      }
      p3d_registrar_pagamento: {
        Args: {
          p_data?: string
          p_forma?: string
          p_lancar_financeiro?: boolean
          p_observacao?: string
          p_pedido_id: string
          p_tipo?: string
          p_valor: number
        }
        Returns: Json
      }
      p3d_relatorio_produtividade: {
        Args: { p_ate: string; p_de: string; p_ws: string }
        Returns: Json
      }
      p3d_relatorio_produtos: {
        Args: { p_ate: string; p_de: string; p_limite?: number; p_ws: string }
        Returns: Json
      }
      p3d_relatorio_vendas: {
        Args: { p_agrupar?: string; p_ate: string; p_de: string; p_ws: string }
        Returns: Json
      }
      p3d_remover_item_orcamento: {
        Args: { p_item_id: string }
        Returns: undefined
      }
      p3d_salvar_item_orcamento: {
        Args: {
          p_descricao: string
          p_entrada: Json
          p_item_id?: string
          p_orcamento_id: string
          p_produto_id?: string
          p_quantidade: number
          p_variacao_id?: string
        }
        Returns: string
      }
      p3d_simular_preco: {
        Args: { p_entrada: Json; p_ws: string }
        Returns: Json
      }
      pessoas_da_empresa: {
        Args: { p_workspace_id: string }
        Returns: {
          nome: string
          papel: string
          pessoa_id: string
        }[]
      }
      recusar_convite: { Args: { p_token: string }; Returns: undefined }
      regenerar_codigo_perfil_acesso: {
        Args: { p_id: string }
        Returns: string
      }
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
      remover_membro: {
        Args: { p_membro_id: string; p_workspace_id: string }
        Returns: undefined
      }
      renomear_empresa: {
        Args: { p_nome: string; p_workspace_id: string }
        Returns: undefined
      }
      responder_solicitacao_acesso: {
        Args: { p_aprovar: boolean; p_id: string }
        Returns: undefined
      }
      responder_solicitacao_vendedor: {
        Args: { p_aprovar: boolean; p_id: string }
        Returns: undefined
      }
      salvar_rotulos: {
        Args: { p_rotulos: Json; p_workspace_id: string }
        Returns: undefined
      }
      solicitar_acesso: { Args: { p_codigo: string }; Returns: string }
      solicitar_acesso_vendedor: { Args: { p_codigo: string }; Returns: string }
      tem_permissao: {
        Args: {
          p_extra?: string
          p_modulo: string
          p_nivel?: string
          p_ws: string
        }
        Returns: boolean
      }
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
