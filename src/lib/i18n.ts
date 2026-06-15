/* 多语言翻译表 — 覆盖导航、页面标题、通用操作词 */
import { useApp, type Language } from '@/contexts/AppContext';

type TranslationKey =
  | 'nav.chat' | 'nav.knowledge' | 'nav.tools' | 'nav.settings'
  | 'module.chat' | 'module.knowledge' | 'module.tools' | 'module.settings'
  | 'settings.appearance' | 'settings.agent' | 'settings.api' | 'settings.billing'
  | 'billing.title' | 'billing.subtitle'
  | 'agent.title' | 'agent.subtitle'
  | 'action.save' | 'action.cancel' | 'action.delete' | 'action.edit' | 'action.create' | 'action.search'
  | 'action.upload' | 'action.rename' | 'action.confirm'
  | 'kb.vector' | 'kb.wiki' | 'kb.ontology'
  | 'common.loading' | 'common.empty' | 'common.error';

type Translations = Record<TranslationKey, string>;

const TRANSLATIONS: Record<Language, Translations> = {
  zh: {
    'nav.chat':           '对话',
    'nav.knowledge':      '知识库',
    'nav.tools':          '扩展',
    'nav.settings':       '设置',
    'module.chat':        '对话',
    'module.knowledge':   '知识库',
    'module.tools':       '扩展',
    'module.settings':    '设置',
    'settings.appearance':'外观',
    'settings.agent':     '智能体配置',
    'settings.api':       'API 设置',
    'settings.billing':   '计费中心',
    'billing.title':      '计费中心',
    'billing.subtitle':   'Token 使用量与费用概览',
    'agent.title':        '智能体配置',
    'agent.subtitle':     '配置 Agent 的角色、模型与触发规则，点击卡片可编辑',
    'action.save':        '保存',
    'action.cancel':      '取消',
    'action.delete':      '删除',
    'action.edit':        '编辑',
    'action.create':      '创建',
    'action.search':      '搜索',
    'action.upload':      '上传',
    'action.rename':      '重命名',
    'action.confirm':     '确认',
    'kb.vector':          '向量知识库',
    'kb.wiki':            'Wiki 知识库',
    'kb.ontology':        '本体知识库',
    'common.loading':     '加载中...',
    'common.empty':       '暂无数据',
    'common.error':       '出错了',
  },
  en: {
    'nav.chat':           'Chat',
    'nav.knowledge':      'Knowledge',
    'nav.tools':          'Extensions',
    'nav.settings':       'Settings',
    'module.chat':        'Chat',
    'module.knowledge':   'Knowledge Base',
    'module.tools':       'Extensions',
    'module.settings':    'Settings',
    'settings.appearance':'Appearance',
    'settings.agent':     'Agent Config',
    'settings.api':       'API Settings',
    'settings.billing':   'Billing',
    'billing.title':      'Billing',
    'billing.subtitle':   'Token usage and cost overview',
    'agent.title':        'Agent Configuration',
    'agent.subtitle':     'Configure agent roles, models and trigger rules. Click a card to edit.',
    'action.save':        'Save',
    'action.cancel':      'Cancel',
    'action.delete':      'Delete',
    'action.edit':        'Edit',
    'action.create':      'Create',
    'action.search':      'Search',
    'action.upload':      'Upload',
    'action.rename':      'Rename',
    'action.confirm':     'Confirm',
    'kb.vector':          'Vector KB',
    'kb.wiki':            'Wiki KB',
    'kb.ontology':        'Ontology KB',
    'common.loading':     'Loading...',
    'common.empty':       'No data',
    'common.error':       'Something went wrong',
  },
  ja: {
    'nav.chat':           'チャット',
    'nav.knowledge':      'ナレッジ',
    'nav.tools':          '拡張機能',
    'nav.settings':       '設定',
    'module.chat':        'チャット',
    'module.knowledge':   'ナレッジベース',
    'module.tools':       '拡張機能',
    'module.settings':    '設定',
    'settings.appearance':'外観',
    'settings.agent':     'エージェント設定',
    'settings.api':       'API 設定',
    'settings.billing':   '請求センター',
    'billing.title':      '請求センター',
    'billing.subtitle':   'トークン使用量と費用の概要',
    'agent.title':        'エージェント設定',
    'agent.subtitle':     'エージェントの役割、モデル、トリガールールを設定します。',
    'action.save':        '保存',
    'action.cancel':      'キャンセル',
    'action.delete':      '削除',
    'action.edit':        '編集',
    'action.create':      '作成',
    'action.search':      '検索',
    'action.upload':      'アップロード',
    'action.rename':      '名前変更',
    'action.confirm':     '確認',
    'kb.vector':          'ベクターKB',
    'kb.wiki':            'Wiki KB',
    'kb.ontology':        'オントロジーKB',
    'common.loading':     '読み込み中...',
    'common.empty':       'データなし',
    'common.error':       'エラーが発生しました',
  },
  ko: {
    'nav.chat':           '대화',
    'nav.knowledge':      '지식베이스',
    'nav.tools':          '확장',
    'nav.settings':       '설정',
    'module.chat':        '대화',
    'module.knowledge':   '지식베이스',
    'module.tools':       '확장',
    'module.settings':    '설정',
    'settings.appearance':'외관',
    'settings.agent':     '에이전트 설정',
    'settings.api':       'API 설정',
    'settings.billing':   '결제 센터',
    'billing.title':      '결제 센터',
    'billing.subtitle':   '토큰 사용량 및 비용 개요',
    'agent.title':        '에이전트 설정',
    'agent.subtitle':     '에이전트 역할, 모델, 트리거 규칙을 설정하세요.',
    'action.save':        '저장',
    'action.cancel':      '취소',
    'action.delete':      '삭제',
    'action.edit':        '편집',
    'action.create':      '만들기',
    'action.search':      '검색',
    'action.upload':      '업로드',
    'action.rename':      '이름 변경',
    'action.confirm':     '확인',
    'kb.vector':          '벡터 KB',
    'kb.wiki':            'Wiki KB',
    'kb.ontology':        '온톨로지 KB',
    'common.loading':     '로딩 중...',
    'common.empty':       '데이터 없음',
    'common.error':       '오류가 발생했습니다',
  },
};

/** useT() — 在组件中获取翻译函数 */
export function useT() {
  const { language } = useApp();
  return (key: TranslationKey, fallback?: string): string => {
    return TRANSLATIONS[language]?.[key] ?? fallback ?? TRANSLATIONS.zh[key] ?? key;
  };
}

/** t() — 非 React 环境（常量数组等）直接调用，需传入 language */
export function t(language: Language, key: TranslationKey, fallback?: string): string {
  return TRANSLATIONS[language]?.[key] ?? fallback ?? TRANSLATIONS.zh[key] ?? key;
}

export type { TranslationKey };
