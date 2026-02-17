import React from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from './ui/alert-dialog';
import { Trash2, AlertTriangle } from 'lucide-react';

export function DeleteConfirmationDialog({
    open,
    onOpenChange,
    onConfirm,
    title = "Are you absolutely sure?",
    description = "This action cannot be undone. This will permanently delete the item and remove the data from our servers.",
    confirmText = "Delete",
    cancelText = "Cancel",
    isDeleting = false
}) {
    const handleConfirm = (e) => {
        e.preventDefault();
        onConfirm();
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="sm:max-w-[425px]">
                <AlertDialogHeader>
                    <div className="flex items-center gap-2 text-red-600 mb-2">
                        <div className="p-2 bg-red-100 rounded-full">
                            <Trash2 className="w-5 h-5" />
                        </div>
                        <AlertDialogTitle className="text-xl text-foreground">{title}</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="pt-2">
                        {description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4 gap-2 sm:gap-0">
                    <AlertDialogCancel disabled={isDeleting}>{cancelText}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
                        disabled={isDeleting}
                    >
                        {isDeleting ? "Deleting..." : confirmText}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
