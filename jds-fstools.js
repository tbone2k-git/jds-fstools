// #############################################################################
// JDSFSTools (jDownloader Scripting Filesystem Tools) v0.1, 2021-11-08, tb..
// Some file and folder managing methods for jDownloader scripting.
// 
// https://github.com/tbone2k-git/jds-fstools
//
// Since there are 7 methods in jDownloader to handle copying/moving of files
// and folders (copyTo(), copyTo(,,), moveTo(), rename(), renameName(),
// renamePath() and renameTo()) and none of them worked as I expected, I wrote
// this helper class to make life more easy with files and folders in JD.
//
// Some benefits:
//  - always "fullpath" parameters, no more guessing
//  - always same result object instead of bool vs. object
//  - auto create paths (missing parent folders)
//  - support for recursive operations (can be disabled)
//  - support for moving across different mountpoints/drives
//  - detailed error message and return code for each error situation
//  - control "already exists" handling for files and folders..
//        abort       - abort operation (default)
//        skip        - skip existing
//        rename-dts  - append timestamp to existing
//        replace     - replace existing 
//        merge       - merge existing (folders only)
//
// Examples:
// 1) Copy folder "foo" to "bar" recursively, force replacing of existing files,
//    merge folder contents if folders already exist:
//      var result = JDSFSTools.copy("D:\\foo", "D:\\bar", {
//                                              fileMode: "replace",
//                                              fldrMode: "merge" } );
//
// 2) Copy folder "foo" to "bar", auto-rename existing files in subfolders
//      var result = JDSFSTools.move("D:\\foo", "D:\\bar", {
//                                              fileMode: "rename-dts",
//                                              fldrMode: "merge" } );
//
// 3) Copy folder "foo" to folder "bar" (which exists), auto append timestamp 
//      var result = JDSFSTools.move("D:\\foo", "D:\\bar", {fldrMode: "rename-dts"});
//      // result.success == true
//      // result.dstPath == "D:\\bar_1636490640569"
//
// 4) Copy folder "foo" to "bar" non-recursively, skip existing files.
//      var result = JDSFSTools.copy("D:\\foo", "D:\\bar", { 
//                                              recursive: false,
//                                              fileMode: "skip" } );
//
// 5) Move/rename folder "foo" to "bar" on the same drive (will rename)
//      var result = JDSFSTools.move("D:\\foo", "D:\\bar");
//
// 6) Move folder "foo" to "bar" on different drive (will copy+del)
//      var result = JDSFSTools.move("C:\\foo", "D:\\bar");
//
// 7) Copy not existing folder "noex" to "bar" 
//      var result = JDSFSTools.move("D:\\noex", "D:\\bar");
//      // result.success == false
//      // result.retCode == JDSFSTools.RC_ERR_SRC_NOTFOUND
//      // result.message == "Error, src [D:\noext] not found."
//
// 8) ..
//
// #############################################################################
var JDSFSTools = new (function() {

    // #########################################################################
    // copy() - Copy a file or folder.
    //                                    
    // Parameters (* = default, [] = optional):
    //   String: srcFullPath        full path to source file/folder
    //   String: dstFullPath        full path to destination file/folder
    //
    //   Object: [options] {        copy options
    //      String: fileMode,       // abort*, skip, rename-dts, replace 
    //      String: fldrMode,       // abort*, skip, rename-dts, replace, merge
    //      Bool:   recursive       // recursive processing true*, false
    //   }
    //  
    // Result Object: {
    //   Bool:     success,    Long:     retCode,    String: message,
    //   FilePath: srcPath,    FilePath: dstPath
    //   }
    // #########################################################################
    this.copy = function copy( srcFullPath, dstFullPath, options ) {
        var options = options || {}; options._opmode = "copy";
        return this._copyMove( srcFullPath, dstFullPath, options );
    };

    // #########################################################################
    // move() - Move a file or folder. 
    // Same as copy, but move (for params and results, look copy() method.
    // #########################################################################
    this.move = function move( srcFullPath, dstFullPath, options ) {
        var options = options || {}; options._opmode = "move";
        return this._copyMove( srcFullPath, dstFullPath, options );
    };
                                    
    // #########################################################################
    // internal vars and "constants"
    // #########################################################################
    var that                        = this;
    this.VALID_OPMODES              = " copy move ";
    this.VALID_FILEMODES            = " abort skip rename-dts replace ";
    this.VALID_FLDRMODES            = " abort skip rename-dts replace merge ";
    this.RC_SUCCESS                 = 0;
    this.RC_ERR_BAD_OPMODE          = 2;
    this.RC_ERR_BAD_FILEMODE        = 4;
    this.RC_ERR_BAD_FLDRMODE        = 8;
    this.RC_ERR_SRC_NOTFOUND        = 16;
    this.RC_ERR_DST_EXISTS          = 32
    this.RC_ERR_DST_REPLACE_FAILED  = 64;
    this.RC_ERR_DST_MKDIR_FAILED    = 128;
    this.RC_ERR_UNKNOWN             = 256;

    // #########################################################################
    // internal methods and classes
    // #########################################################################
    this._Result = function _Result( retCode, message, srcPath, dstPath ) {
        this.success = (retCode == that.RC_SUCCESS);
        this.retCode = retCode;
        this.message = message;
        this.srcPath = srcPath;
        this.dstPath = dstPath;
    };

    // #########################################################################
    this._copyMove = function copyMove( srcFullPath, dstFullPath, options ) {
        var defaults = {
                recursive   : true,
                fileMode    : "abort", // abort, skip, replace, rename-dts
                fldrMode    : "abort", // abort, skip, replace, rename-dts, merge
                _timestamp  : getCurrentTimeStamp()
            }
        
        //merge default options with incoming custom options
        var options = Object.assign( defaults, options || {});
        
        //trim trailing slashes and create FilePath objects..
        var srcFullPathObj = getPath(srcFullPath.replace(/[/\\]+$/, ""));
        var dstFullPathObj = getPath(dstFullPath.replace(/[/\\]+$/, ""));
        
        //validate options
        if (this.VALID_OPMODES.indexOf(" "+options._opmode+" ")==-1)
            return new this._Result( this.RC_ERR_BAD_OPMODE,
                    "Error, bad opmode ["+options._opmode+"].",
                    srcFullPathObj, dstFullPathObj );
                    
        if (this.VALID_FILEMODES.indexOf(" "+options.fileMode+" ")==-1)
            return new this._Result( this.RC_ERR_BAD_FILEMODE,
                    "Error, bad filemode ["+options.fileMode+"].",
                    srcFullPathObj, dstFullPathObj );
                    
        if (this.VALID_FLDRMODES.indexOf(" "+options.fldrMode+" ")==-1)
            return new this._Result( this.RC_ERR_BAD_FLDRMODE,
                    "Error, bad fldrmode ["+options.fldrMode+"].",
                    srcFullPathObj, dstFullPathObj);
                                        
        //validate src path
        if(!srcFullPathObj.exists())
            return new this._Result( this.RC_ERR_SRC_NOTFOUND,
                    "Error, src ["+srcFullPathObj+"] not found.",
                    srcFullPathObj, dstFullPathObj );
        
        if (srcFullPathObj.isFile())
            return this._copyMoveFile( srcFullPathObj, dstFullPathObj, options );
        if (srcFullPathObj.isDirectory())
            return this._copyMoveFolder( srcFullPathObj, dstFullPathObj, options );
    };

    // #########################################################################
    this._copyMoveFile = function _copyMoveFile( srcFullPathObj, dstFullPathObj, options ) {
        
        var dstExists = dstFullPathObj.exists(), mcResult = null;
        
        if (0);
        else if (dstExists && options.fileMode == "abort")
            return new this._Result( this.RC_ERR_DST_EXISTS,
                    "Error, dst-file ["+dstFullPathObj+"] already exists.",
                    srcFullPathObj, dstFullPathObj );
                    
        else if (dstExists && options.fileMode == "skip")
            return new this._Result( this.RC_SUCCESS,
                    "Info, dst-file ["+dstFullPathObj+"] already exists, skipped.",
                    srcFullPathObj, dstFullPathObj );

        else if (dstExists && options.fileMode == "rename-dts")
            dstFullPathObj = getPath( dstFullPathObj.getParent() + "/" +
                    dstFullPathObj.getName().
                    replace(/^(.*)\.(.+$)/i, "$1_"+options._timestamp+".$2" )
            );

        else if (dstExists && options.fileMode == "replace") {
            dstFullPathObj.delete();
            if (dstFullPathObj.exists())
                return new this._Result( this.RC_ERR_DST_REPLACE_FAILED,
                        "Error, replacing dst-file ["+dstFullPathObj+"] failed.",
                        srcFullPathObj, dstFullPathObj );
        }
        
        if (options._opmode == "move") 
            mcResult = srcFullPathObj.rename(
                dstFullPathObj );
        
        if (options._opmode == "copy") 
            mcResult = srcFullPathObj.copyTo(
                dstFullPathObj.getParent(), dstFullPathObj.getName(), false );
        
        if (!mcResult) //bool (false) or object (null), depending on what JD method 
            return new this._Result( this.RC_ERR_UNKNOWN,
                    "Processing src-file ["+srcFullPathObj+"] failed, reason unknown.",
                    srcFullPathObj, dstFullPathObj );
                
        return new this._Result( this.RC_SUCCESS, "ok", srcFullPathObj, dstFullPathObj );
    };

    // #########################################################################
    this._copyMoveFolder = function _copyMoveFolder( srcFullPathObj, dstFullPathObj, options) {

        var dstExists = dstFullPathObj.exists();
        
        if (0);
        else if (dstExists && options.fldrMode == "abort")
            return new this._Result( this.RC_ERR_DST_EXISTS,
                    "Error, dst-folder ["+dstFullPathObj+"] already exists.",
                    srcFullPathObj, dstFullPathObj );
        
        else if (dstExists && options.fldrMode == "skip")
            return new this._Result( this.RC_SUCCESS, 
                    "Info, dst-folder ["+dstFullPathObj+"] already exists, skipped.",
                    srcFullPathObj, dstFullPathObj );

        else if (dstExists && options.fldrMode == "rename-dts")
            dstFullPathObj = getPath( dstFullPathObj.getParent() + "/" + 
                    dstFullPathObj.getName() + "_" + options._timestamp
            );

        else if (dstExists && options.fldrMode == "replace") {
            dstFullPathObj.deleteRecursive();
            if (dstFullPathObj.exists())
                return new this._Result( this.RC_ERR_DST_REPLACE_FAILED,
                        "Error, dst-folder ["+ dstFullPathObj+"] del-replacing failed.",
                        srcFullPathObj, dstFullPathObj );
        }
        
        else if (dstExists && options.fldrMode == "merge");
        
        //move-by-rename
        if (options._opmode == "move") {
            //will fail for (existing dst + "merge") or (different mountpoints)
            var mcResult = srcFullPathObj.rename( dstFullPathObj );
            if (mcResult && !srcFullPathObj.exists() && dstFullPathObj.exists())
                return new this._Result( this.RC_SUCCESS, "ok",
                        srcFullPathObj, dstFullPathObj );
        }
        
        //move-by-copy+del and regular copy
        dstFullPathObj.mkdirs();
        if (!dstFullPathObj.exists())
            return new this._Result( this.RC_ERR_DST_MKDIR_FAILED,
                    "Error, dst-folder ["+dstFullPathObj+"] could not be created.",
                    srcFullPathObj, dstFullPathObj );
    
        var children = srcFullPathObj.getChildren();
        for(var c=0;c<children.length;c++) {
            var child = children[c];
            if (child.isFile()) {
                var copyResult = this._copyMoveFile(
                        child,
                        getPath(dstFullPathObj+"/"+child.getName()), options );
                if (!copyResult.success) return copyResult;
            } 
            if (child.isDirectory()) {
                if (!options.recursive) continue;
                var copyResult = this._copyMoveFolder(
                        getPath(srcFullPathObj+"/"+child.getName()),
                        getPath(dstFullPathObj+"/"+child.getName()), options );
                if (!copyResult.success) return copyResult;
            }
        }
     
        //move-by-copy+del
        if (options._opmode == "move") {
            srcFullPathObj.delete();
            if (srcFullPathObj.exists())
                ;//could not delete src folder, worth exiting with error?!
        }
        return new this._Result( this.RC_SUCCESS, "ok", srcFullPathObj, dstFullPathObj );
    };

    // #########################################################################
    // Object.assign() - polyfill
    // original: https://gist.github.com/spiralx/68cf40d7010d829340cb
    // #########################################################################
    this._addObjectAssignPolyfill = function _addObjectAssignPolyfill() {
        Object.defineProperty(Object, 'assign', { enumerable: false,
            configurable: true,
            writable: true, value:
            function(target) { 'use strict';
                if (target === undefined || target === null)
                    throw new TypeError('Cannot convert first argument to object.');
                var to = Object(target);
                for (var i = 1; i < arguments.length; i++) {
                    var srcObj = arguments[i], desc, keysArray;
                    if (srcObj === undefined || srcObj === null) continue;
                    srcObj = Object(srcObj);
                    keysArray = Object.keys(Object(srcObj));
                    for (var ii=0, len=keysArray.length; ii<len; ii++) {
                        var key = keysArray[ii];
                        desc = Object.getOwnPropertyDescriptor(srcObj, key);
                        if (desc !== undefined && desc.enumerable)
                            to[key] = srcObj[key];
                    }
                }
                return to;
            }
        });
    };
    
    // #########################################################################
    if (!Object.assign) this._addObjectAssignPolyfill();
    
});
// #############################################################################
// Notes:
// - jDownloaders internal methods source code
//      https://github.com/mirror/jdownloader/blob/master/src/org/jdownloader/
//      extensions/eventscripter/sandboxobjects/FilePathSandbox.java
// #############################################################################
 
