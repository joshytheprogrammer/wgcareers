<template>
  <div id="admin-editor">
    <!-- Link Dialog -->
    <Transition name="fade">
      <div v-if="showLinkDialog" class="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Transition name="scale">
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md transform transition-all"
            @keydown.esc="showLinkDialog = false">
            <div class="p-5 border-b border-gray-200 dark:border-gray-700">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                Insert Link
              </h3>
            </div>
            
            <form @submit.prevent="handleLinkSubmit" class="p-5">
              <div class="space-y-4">
                <UFormField label="Link URL" required>
                  <UInput
                    ref="linkInput"
                    v-model="linkUrl"
                    type="url"
                    placeholder="https://example.com"
                    autofocus
                    icon="i-heroicons-link"
                    class="w-full"
                    @keydown.enter.prevent="handleLinkSubmit"
                  />
                </UFormField>
                
                <div class="flex justify-end gap-3 pt-2">
                  <UButton
                    type="button"
                    @click="showLinkDialog = false"
                    color="gray"
                    variant="ghost"
                    label="Cancel"
                  />
                  <UButton
                    type="submit"
                    color="primary"
                    label="Apply Link"
                    :disabled="!linkUrl"
                  />
                </div>
              </div>
            </form>
          </div>
        </Transition>
      </div>
    </Transition>

    <div v-if="editor" class="space-x-2 pt-1 pb-2">
      <button type="button"
        @click="editor.chain().focus().toggleBold().run()"
        :disabled="!editor.can().chain().focus().toggleBold().run()"
        :class="{ 'is-active bg-slate-300 dark:bg-slate-300': editor.isActive('bold') }"
        class="w-6 py-1 px-1 active:ring-1 rounded-sm focus:ring-primary-500 "
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M8 11H12.5C13.8807 11 15 9.88071 15 8.5C15 7.11929 13.8807 6 12.5 6H8V11ZM18 15.5C18 17.9853 15.9853 20 13.5 20H6V4H12.5C14.9853 4 17 6.01472 17 8.5C17 9.70431 16.5269 10.7981 15.7564 11.6058C17.0979 12.3847 18 13.837 18 15.5ZM8 13V18H13.5C14.8807 18 16 16.8807 16 15.5C16 14.1193 14.8807 13 13.5 13H8Z"></path></svg>
      </button>
      <button type="button"
        @click="editor.chain().focus().toggleItalic().run()"
        :disabled="!editor.can().chain().focus().toggleItalic().run()"
        :class="{ 'is-active bg-slate-300 dark:bg-slate-300': editor.isActive('italic') }"
        class="w-6 py-1 px-1 active:ring-1 rounded-sm focus:ring-primary-500 "
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M15 20H7V18H9.92661L12.0425 6H9V4H17V6H14.0734L11.9575 18H15V20Z"></path></svg>
      </button>
      <button type="button"
        @click="setLink"
        :class="{ 'is-active bg-slate-300 dark:bg-slate-300': editor.isActive('link') }"
        class="w-6 py-1 px-1 active:ring-1 rounded-sm focus:ring-primary-500"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.364 15.5355L16.9497 14.1213L18.364 12.7071C20.3166 10.7545 20.3166 7.58866 18.364 5.63604C16.4113 3.68342 13.2455 3.68342 11.2929 5.63604L9.87868 7.05025L8.46447 5.63604L9.87868 4.22183C12.6123 1.48815 17.0445 1.48815 19.7782 4.22183C22.5118 6.9555 22.5118 11.3877 19.7782 14.1213L18.364 15.5355ZM15.5355 18.364L14.1213 19.7782C11.3877 22.5118 6.9555 22.5118 4.22183 19.7782C1.48815 17.0445 1.48815 12.6123 4.22183 9.87868L5.63604 8.46447L7.05025 9.87868L5.63604 11.2929C3.68342 13.2455 3.68342 16.4113 5.63604 18.364C7.58866 20.3166 10.7545 20.3166 12.7071 18.364L14.1213 16.9497L15.5355 18.364ZM14.8284 7.75736L16.2426 9.17157L9.17157 16.2426L7.75736 14.8284L14.8284 7.75736Z"></path>
        </svg>
      </button>
      <button type="button"
        @click="editor.chain().focus().toggleStrike().run()"
        :disabled="!editor.can().chain().focus().toggleStrike().run()"
        :class="{ 'is-active bg-slate-300 dark:bg-slate-300': editor.isActive('strike') }"
        class="w-6 py-1 px-1 active:ring-1 rounded-sm focus:ring-primary-500 "
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M17.1538 14C17.3846 14.5161 17.5 15.0893 17.5 15.7196C17.5 17.0625 16.9762 18.1116 15.9286 18.867C14.8809 19.6223 13.4335 20 11.5862 20C9.94674 20 8.32335 19.6185 6.71592 18.8555V16.6009C8.23538 17.4783 9.7908 17.917 11.3822 17.917C13.9333 17.917 15.2128 17.1846 15.2208 15.7196C15.2208 15.0939 15.0049 14.5598 14.5731 14.1173C14.5339 14.0772 14.4939 14.0381 14.4531 14H3V12H21V14H17.1538ZM13.076 11H7.62908C7.4566 10.8433 7.29616 10.6692 7.14776 10.4778C6.71592 9.92084 6.5 9.24559 6.5 8.45207C6.5 7.21602 6.96583 6.165 7.89749 5.299C8.82916 4.43299 10.2706 4 12.2219 4C13.6934 4 15.1009 4.32808 16.4444 4.98426V7.13591C15.2448 6.44921 13.9293 6.10587 12.4978 6.10587C10.0187 6.10587 8.77917 6.88793 8.77917 8.45207C8.77917 8.87172 8.99709 9.23796 9.43293 9.55079C9.86878 9.86362 10.4066 10.1135 11.0463 10.3004C11.6665 10.4816 12.3431 10.7148 13.076 11H13.076Z"></path></svg>
      </button>
      <button type="button"
        @click="editor.chain().focus().toggleCode().run()"
        :disabled="!editor.can().chain().focus().toggleCode().run()"
        :class="{ 'is-active bg-slate-300 dark:bg-slate-300': editor.isActive('code') }"
        class="w-6 py-1 px-1 active:ring-1 rounded-sm focus:ring-primary-500 "
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M16.95 8.46448L18.3642 7.05026L23.3139 12L18.3642 16.9498L16.95 15.5355L20.4855 12L16.95 8.46448ZM7.05048 8.46448L3.51495 12L7.05048 15.5355L5.63627 16.9498L0.686523 12L5.63627 7.05026L7.05048 8.46448Z"></path></svg>
      </button>
      <button type="button"
        @click="editor.chain().focus().setParagraph().run()"
        :class="{ 'is-active ': editor.isActive('paragraph') }"
        class="w-6 py-1 px-1 active:ring-1 rounded-sm focus:ring-primary-500 "
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 6V21H10V16C6.68629 16 4 13.3137 4 10C4 6.68629 6.68629 4 10 4H20V6H17V21H15V6H12ZM10 6C7.79086 6 6 7.79086 6 10C6 12.2091 7.79086 14 10 14V6Z"></path></svg>
      </button>
      <button type="button"
        @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
        :class="{ 'is-active bg-slate-300 dark:bg-slate-300': editor.isActive('heading', { level: 1 }) }"
        class="w-6 py-1 px-1 active:ring-1 rounded-sm focus:ring-primary-500 "
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M13 20H11V13H4V20H2V4H4V11H11V4H13V20ZM21.0005 8V20H19.0005L19 10.204L17 10.74V8.67L19.5005 8H21.0005Z"></path></svg>
      </button>
      <button type="button"
        @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
        :class="{ 'is-active bg-slate-300 dark:bg-slate-300': editor.isActive('heading', { level: 2 }) }"
        class="w-6 py-1 px-1 active:ring-1 rounded-sm focus:ring-primary-500 "
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4V11H11V4H13V20H11V13H4V20H2V4H4ZM18.5 8C20.5711 8 22.25 9.67893 22.25 11.75C22.25 12.6074 21.9623 13.3976 21.4781 14.0292L21.3302 14.2102L18.0343 18H22V20H15L14.9993 18.444L19.8207 12.8981C20.0881 12.5908 20.25 12.1893 20.25 11.75C20.25 10.7835 19.4665 10 18.5 10C17.5818 10 16.8288 10.7071 16.7558 11.6065L16.75 11.75H14.75C14.75 9.67893 16.4289 8 18.5 8Z"></path></svg>
      </button>
      <button type="button"
        @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
        :class="{ 'is-active bg-slate-300 dark:bg-slate-300': editor.isActive('heading', { level: 3 }) }"
        class="w-6 py-1 px-1 active:ring-1 rounded-sm focus:ring-primary-500 "
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M22 8L21.9984 10L19.4934 12.883C21.0823 13.3184 22.25 14.7728 22.25 16.5C22.25 18.5711 20.5711 20.25 18.5 20.25C16.674 20.25 15.1528 18.9449 14.8184 17.2166L16.7821 16.8352C16.9384 17.6413 17.6481 18.25 18.5 18.25C19.4665 18.25 20.25 17.4665 20.25 16.5C20.25 15.5335 19.4665 14.75 18.5 14.75C18.214 14.75 17.944 14.8186 17.7056 14.9403L16.3992 13.3932L19.3484 10H15V8H22ZM4 4V11H11V4H13V20H11V13H4V20H2V4H4Z"></path></svg>
      </button>
      <button type="button"
        @click="editor.chain().focus().toggleHeading({ level: 4 }).run()"
        :class="{ 'is-active bg-slate-300 dark:bg-slate-300': editor.isActive('heading', { level: 4 }) }"
        class="w-6 py-1 px-1 active:ring-1 rounded-sm focus:ring-primary-500 "
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M13 20H11V13H4V20H2V4H4V11H11V4H13V20ZM22 8V16H23.5V18H22V20H20V18H14.5V16.66L19.5 8H22ZM20 11.133L17.19 16H20V11.133Z"></path></svg>
      </button>
      <button type="button"
        @click="editor.chain().focus().toggleHeading({ level: 5 }).run()"
        :class="{ 'is-active bg-slate-300 dark:bg-slate-300': editor.isActive('heading', { level: 5 }) }"
        class="w-6 py-1 px-1 active:ring-1 rounded-sm focus:ring-primary-500 "
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M22 8V10H17.6769L17.2126 12.6358C17.5435 12.5472 17.8912 12.5 18.25 12.5C20.4591 12.5 22.25 14.2909 22.25 16.5C22.25 18.7091 20.4591 20.5 18.25 20.5C16.4233 20.5 14.8827 19.2756 14.4039 17.6027L16.3271 17.0519C16.5667 17.8881 17.3369 18.5 18.25 18.5C19.3546 18.5 20.25 17.6046 20.25 16.5C20.25 15.3954 19.3546 14.5 18.25 14.5C17.6194 14.5 17.057 14.7918 16.6904 15.2478L14.8803 14.3439L16 8H22ZM4 4V11H11V4H13V20H11V13H4V20H2V4H4Z"></path></svg>
      </button>
      <button type="button"
        @click="editor.chain().focus().toggleHeading({ level: 6 }).run()"
        :class="{ 'is-active bg-slate-300 dark:bg-slate-300': editor.isActive('heading', { level: 6 }) }"
        class="w-6 py-1 px-1 active:ring-1 rounded-sm focus:ring-primary-500 "
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M21.097 8L18.499 12.5C20.7091 12.5 22.5 14.2909 22.5 16.5C22.5 18.7091 20.7091 20.5 18.5 20.5C16.2909 20.5 14.5 18.7091 14.5 16.5C14.5 15.7636 14.699 15.0737 15.0461 14.4811L18.788 8H21.097ZM4 4V11H11V4H13V20H11V13H4V20H2V4H4ZM18.5 14.5C17.3954 14.5 16.5 15.3954 16.5 16.5C16.5 17.6046 17.3954 18.5 18.5 18.5C19.6046 18.5 20.5 17.6046 20.5 16.5C20.5 15.3954 19.6046 14.5 18.5 14.5Z"></path></svg>
      </button>
      <button type="button"
        @click="editor.chain().focus().toggleBulletList().run()"
        :class="{ 'is-active bg-slate-300 dark:bg-slate-300': editor.isActive('bulletList') }"
        class="w-6 py-1 px-1 active:ring-1 rounded-sm focus:ring-primary-500 "
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M8 4H21V6H8V4ZM4.5 6.5C3.67157 6.5 3 5.82843 3 5C3 4.17157 3.67157 3.5 4.5 3.5C5.32843 3.5 6 4.17157 6 5C6 5.82843 5.32843 6.5 4.5 6.5ZM4.5 13.5C3.67157 13.5 3 12.8284 3 12C3 11.1716 3.67157 10.5 4.5 10.5C5.32843 10.5 6 11.1716 6 12C6 12.8284 5.32843 13.5 4.5 13.5ZM4.5 20.4C3.67157 20.4 3 19.7284 3 18.9C3 18.0716 3.67157 17.4 4.5 17.4C5.32843 17.4 6 18.0716 6 18.9C6 19.7284 5.32843 20.4 4.5 20.4ZM8 11H21V13H8V11ZM8 18H21V20H8V18Z"></path></svg>
      </button>
      <button type="button"
        @click="editor.chain().focus().toggleOrderedList().run()"
        :class="{ 'is-active bg-slate-300 dark:bg-slate-300': editor.isActive('orderedList') }"
        class="w-6 py-1 px-1 active:ring-1 rounded-sm focus:ring-primary-500 "
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M8 4H21V6H8V4ZM5 3V6H6V7H3V6H4V4H3V3H5ZM3 14V11.5H5V11H3V10H6V12.5H4V13H6V14H3ZM5 19.5H3V18.5H5V18H3V17H6V21H3V20H5V19.5ZM8 11H21V13H8V11ZM8 18H21V20H8V18Z"></path></svg>
      </button>
      <button type="button"
        @click="editor.chain().focus().toggleCodeBlock().run()"
        :class="{ 'is-active bg-slate-300 dark:bg-slate-300': editor.isActive('codeBlock') }"
        class="w-6 py-1 px-1 active:ring-1 rounded-sm focus:ring-primary-500 "
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3.41436 5.99995L5.70726 3.70706L4.29304 2.29285L0.585938 5.99995L4.29304 9.70706L5.70726 8.29285L3.41436 5.99995ZM9.58594 5.99995L7.29304 3.70706L8.70726 2.29285L12.4144 5.99995L8.70726 9.70706L7.29304 8.29285L9.58594 5.99995ZM14.0002 2.99995H21.0002C21.5524 2.99995 22.0002 3.44767 22.0002 3.99995V20C22.0002 20.5522 21.5524 21 21.0002 21H3.00015C2.44787 21 2.00015 20.5522 2.00015 20V12H4.00015V19H20.0002V4.99995H14.0002V2.99995Z"></path></svg>
      </button>
      <button type="button"
        @click="editor.chain().focus().undo().run()"
        :disabled="!editor.can().chain().focus().undo().run()"
        class="w-6 py-1 px-1 active:ring-1 rounded-sm focus:ring-primary-500 "
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M5.82843 6.99955L8.36396 9.53509L6.94975 10.9493L2 5.99955L6.94975 1.0498L8.36396 2.46402L5.82843 4.99955H13C17.4183 4.99955 21 8.58127 21 12.9996C21 17.4178 17.4183 20.9996 13 20.9996H4V18.9996H13C16.3137 18.9996 19 16.3133 19 12.9996C19 9.68584 16.3137 6.99955 13 6.99955H5.82843Z"></path></svg>
      </button>
      <button type="button"
        @click="editor.chain().focus().redo().run()"
        :disabled="!editor.can().chain().focus().redo().run()"
        class="w-6 py-1 px-1 active:ring-1 rounded-sm focus:ring-primary-500 "
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M18.1716 6.99955H11C7.68629 6.99955 5 9.68584 5 12.9996C5 16.3133 7.68629 18.9996 11 18.9996H20V20.9996H11C6.58172 20.9996 3 17.4178 3 12.9996C3 8.58127 6.58172 4.99955 11 4.99955H18.1716L15.636 2.46402L17.0503 1.0498L22 5.99955L17.0503 10.9493L15.636 9.53509L18.1716 6.99955Z"></path></svg>
      </button>
    </div>
    <TiptapEditorContent :editor="editor" />
  </div>
</template>

<script setup>
import { Link } from '@tiptap/extension-link'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['update:modelValue']);

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    TiptapStarterKit,
    Link.configure({
      openOnClick: false,
    })
  ],
  onUpdate: ({ editor }) => {
    // HTML
    emit('update:modelValue', editor.getHTML());
  },
  editorProps: {
    attributes: {
      class: "prose-sm w-full min-h-48 font-['Nunito sans'] focus:outline-none shadow-sm bg-white dark:bg-white text-black dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-700 focus:ring-2 focus:ring-black dark:focus:ring-white rounded-md px-3 py-2 ",
    }, 
  },
});

// Link Feature:

const showLinkDialog = ref(false)
const linkUrl = ref('')
const linkInput = ref(null)

const setLink = () => {
  const previousUrl = editor.value.getAttributes('link').href
  linkUrl.value = previousUrl || ''
  showLinkDialog.value = true
  
  nextTick(() => {
    linkInput.value.focus()
    linkInput.value.select()
  })
}

const handleLinkSubmit = () => {
  showLinkDialog.value = false
  
  // Empty URL - remove link
  if (!linkUrl.value?.trim()) {
    editor.value.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }

  // Update link
  let url = linkUrl.value.trim()
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`
  }
  
  editor.value
    .chain()
    .focus()
    .extendMarkRange('link')
    .setLink({ href: url })
    .run()
}

watch(
  () => props.modelValue,
  (newValue) => {
    if (editor.value && editor.value.getHTML() !== newValue) {
      editor.value.commands.setContent(newValue, false);
    }
  }
);

onBeforeUnmount(() => {
  unref(editor).destroy();
});
</script>

<style>
#admin-editor ol {
  list-style: decimal;
  padding-left: 24px;
  margin: 8px 0;
} 

#admin-editor ul {
  list-style: disc;
  padding-left: 24px;
  margin: 8px 0;
}
</style>