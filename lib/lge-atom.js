'use babel'

import { CompositeDisposable } from 'atom';

var EmacsUndoState = {
  ShouldUndo: 'ShouldUndo',
  ShouldRedo: 'ShouldRedo'
};

var subscriptions = null;

function noop() {}

function getEditor(event) {
  if (event.target) {
    return event.target.getModel();
  } else {
    return atom.workspace.getActiveTextEditor();
  }
}

function initEmacsUndoStateForEditor(editor) {
  var textEditorElement;
  editor._emacsUndoState = EmacsUndoState.ShouldUndo;
  textEditorElement = atom.views.getView(editor);
  return textEditorElement.addEventListener('core:cancel', onCancel);
}

function onCancel(event) {
  var editor;
  editor = getEditor(event);
  if (editor._emacsUndoState === EmacsUndoState.ShouldRedo) {
    return editor._emacsUndoState = EmacsUndoState.ShouldUndo;
  } else {
    return editor._emacsUndoState = EmacsUndoState.ShouldRedo;
  }
}

function emacsUndo(event) {
  var editor;
  editor = getEditor(event);
  if (editor._emacsUndoState === EmacsUndoState.ShouldRedo) {
    return editor.redo();
  } else {
    return editor.undo();
  }
}

function autoIndentAndBackToIndentation(event) {
  var editor;
  editor = getEditor(event);
  editor.autoIndentSelectedRows();
  editor.moveCursors(moveToBeginOfIndentation.bind(null, editor))
}

function expandLines(event) {
  var editor, lower, range, upper;
  editor = getEditor(event);
  range = editor.getSelectedBufferRange();
  if (range.start.row <= range.end.row) {
    upper = range.start.copy();
    lower = range.end.copy();
  } else {
    upper = range.end.copy();
    lower = range.start.copy();
  }
  upper.column = beginIndentationColumnOfRow(upper.row, editor);
  lower.column = endColumnOfRow(lower.row, editor);
  if (range.start.row <= range.end.row) {
    range.start = upper;
    range.end = lower;
  } else {
    range.end = upper;
    range.start = lower;
  }
  editor.setSelectedBufferRange(range);
  // set mark
}

function endColumnOfRow(row, editor) {
  var column;
  column = editor.bufferRangeForBufferRow(row).end.column;
  return column;
}

function beginIndentationColumnOfRow(row, editor) {
  var line, targetColumn;
  line = editor.lineTextForBufferRow(row);
  targetColumn = line.search(/\S/);
  if (targetColumn === -1) {
    targetColumn = line.length;
  }
  return targetColumn;
}

function moveToEndOfLine(cursor, editor) {
  var row;
  row = cursor.getBufferPosition().row;
  return cursor.setBufferPosition([row, endColumnOfRow(row, editor)]);
}

function moveToBeginOfIndentation(editor, cursor) {
  var column, position, row;
  position = cursor.getBufferPosition();
  row = position.row;
  column = beginIndentationColumnOfRow(row, editor);
  if (position.column !== column) {
    return cursor.setBufferPosition([row, column]);
  }
}

export default {
  activate: (state) => {
    subscriptions = new CompositeDisposable();

    subscriptions.add(atom.commands.add('atom-workspace', {
      'lge-atom:auto-indent-and-back-to-indentation': autoIndentAndBackToIndentation,
      'lge-atom:noop': noop,
      'lge-atom:emacs-undo': emacsUndo,
      'lge-atom:expand-lines': expandLines
    }));

    subscriptions.add(atom.workspace.observeTextEditors(initEmacsUndoStateForEditor));
  },

  deactivate: () => {
    subscriptions.dispose();
  }
};
