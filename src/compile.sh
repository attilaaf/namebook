#!/bin/bash
out="../index.html"

> "$out"
ext_src=false
ext_css=false
ext_sfx=false
src_files=
css_files=
sfx_files=
while IFS='' read -r line || [[ -n "$line" ]]; do
    if [ "$line" == "/* PASTE EXTERNAL CSS HERE */" ]; then
        files=""

        for file in "${css_files[@]}"
        do
            if [ -z "$file" ]; then
                continue
            else
                if [ -f "$file" ]; then
                    files="${files}${file} "
                else
                    echo "External CSS '$file' does not exist."
                fi
            fi
        done

        cat ${files} | yui-compressor --type css --charset utf8 >> "$out"
        printf "\n" >> "${out}"
        continue
    fi

    if [ "$line" == "<!-- PASTE EXTERNAL JS HERE -->" ]; then
        files=""

        for file in "${src_files[@]}"
        do
            if [ -z "$file" ]; then
                continue
            else
                if [ -f "$file" ]; then
                    files="${files}${file} "
                else
                    echo "External javascript '$file' does not exist."
                fi
            fi
        done

        printf "<script>\n" >> "$out"
        cat ${files} | yui-compressor --type js --charset utf8 >> "$out"
        printf "\n</script>\n" >> "$out"
        continue
    fi

    if [ "$line" == "<!-- BEGIN EXTERNAL CSS -->" ]; then
        ext_css=true
        continue
    fi

    if [ "$line" == "<!-- END EXTERNAL CSS -->" ]; then
        ext_css=false
        continue
    fi

    if [ "$line" == "<!-- BEGIN EXTERNAL SCRIPTS -->" ]; then
        ext_src=true
        continue
    fi

    if [ "$line" == "<!-- END EXTERNAL SCRIPTS -->" ]; then
        ext_src=false
        continue
    fi

    if [ "$ext_css" = true ] ; then
        file=`echo "$line" | cut -d\" -f2`
        css_files+=("$file")
        continue
    fi

    if [ "$ext_src" = true ] ; then
        file=`echo "$line" | cut -d\" -f2`
        src_files+=("$file")
        continue
    fi

    if [ "$ext_sfx" = true ] ; then
        id=`echo "$line" | cut -d\' -f2`
        file=`echo "$line" | cut -d\" -f2`
        sfx_files+=("$id $file")
        continue
    fi

    echo "$line" >> "$out"
done < ${1:-namebook.html}

